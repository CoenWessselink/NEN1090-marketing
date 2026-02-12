@echo off
setlocal
cd /d %~dp0

REM ------------------------------------------------------------
REM Stop any stale backend already on 8001 (prevents bind errors)
REM ------------------------------------------------------------
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8001" ^| findstr LISTENING') do (
  echo [i] Stopping existing process on port 8001 (PID %%P)...
  taskkill /F /PID %%P >nul 2>nul
)
REM --- Python detect (avoids Windows Store alias) ---
set "PYEXE="
if not "%NEN1090_PYTHON_EXE%"=="" if exist "%NEN1090_PYTHON_EXE%" set "PYEXE=%NEN1090_PYTHON_EXE%"
if "%PYEXE%"=="" if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "PYEXE=%LocalAppData%\Programs\Python\Python312\python.exe"
if "%PYEXE%"=="" if exist "%LocalAppData%\Programs\Python\Python311\python.exe" set "PYEXE=%LocalAppData%\Programs\Python\Python311\python.exe"
if "%PYEXE%"=="" if exist "%LocalAppData%\Programs\Python\Python310\python.exe" set "PYEXE=%LocalAppData%\Programs\Python\Python310\python.exe"
if "%PYEXE%"=="" if exist "%LocalAppData%\Programs\Python\Python314\python.exe" set "PYEXE=%LocalAppData%\Programs\Python\Python314\python.exe"
if "%PYEXE%"=="" (
  REM try Python Launcher
  py -3.12 -c "import sys" >nul 2>&1 && set "PYEXE=py -3.12"
)
if "%PYEXE%"=="" (
  py -3.11 -c "import sys" >nul 2>&1 && set "PYEXE=py -3.11"
)
if "%PYEXE%"=="" (
  py -c "import sys" >nul 2>&1 && set "PYEXE=py"
)
if "%PYEXE%"=="" (
  echo.
  echo [ERROR] Python not found.
  echo - Install Python 3.12+ or set NEN1090_PYTHON_EXE
  call :maybe_pause
  exit /b 1
)

REM ============================================
REM NEN1090 Backend - RUN (local dev/test)
REM Default test wachtwoord: Wesselink2012!
REM ============================================

if not exist .env (
  echo No .env found - creating from .env.example
  copy /y .env.example .env >nul
)

REM ---- Pick a working Python (avoid WindowsApps stub) ----
set "PY=python"
where python >nul 2>nul
if errorlevel 1 (
  goto :fallback_py
)

for /f "delims=" %%P in ('where python') do (
  echo %%P | findstr /I "WindowsApps\\python.exe" >nul
  if not errorlevel 1 (
    goto :fallback_py
  )
  goto :have_py
)

:fallback_py
if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
  set "PY=%LocalAppData%\Programs\Python\Python312\python.exe"
  goto :have_py
)
if exist "%LocalAppData%\Programs\Python\Python311\python.exe" (
  set "PY=%LocalAppData%\Programs\Python\Python311\python.exe"
  goto :have_py
)

echo.
echo ERROR: Python niet gevonden.
echo - Installeer Python 3.12 x64 (met pip) OF
echo - Zet python in PATH (en zet WindowsApps python alias uit).
echo.
echo Tip: je hebt vaak Python hier: %LocalAppData%\Programs\Python\Python312\python.exe
call :maybe_pause
exit /b 1

:have_py
echo Using Python: %PY%

echo ===============================
echo NEN1090 Backend RUN
echo ===============================

echo [1/5] Ensure venv...
if not exist venv\Scripts\python.exe (
  "%PY%" -m venv venv
)

echo [2/5] Activate venv...
call venv\Scripts\activate

echo [3/5] Install deps (in venv)...
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo ====== FAILED ======
  echo pip install failed.
  pause
  exit /b 1
)

echo Checking DATABASE_URL from .env ...
python -c "from app.core.config import settings; print('DATABASE_URL=', settings.DATABASE_URL)"

echo [4/5] Run migrations...
set PYTHONPATH=%CD%
python -m alembic upgrade head
if errorlevel 1 (
  echo.
  echo ====== FAILED ======
  echo alembic migration failed. Check .env and DB.
  pause
  exit /b 1
)

echo.
echo [4b/5] Seed demo admin (admin@demo.com / Admin123!)...
python seed_admin.py
if errorlevel 1 (
  echo.
  echo ====== FAILED ======
  echo seed_admin failed. Zonder admin kan login/playwright niet werken.
  pause
  exit /b 1
)

set API_PORT=%API_PORT%
if "%API_PORT%"=="" set API_PORT=8001
echo [5/5] Start API on http://127.0.0.1:%API_PORT% ...
python -m uvicorn app.main:app --host 127.0.0.1 --port %API_PORT%

endlocal
