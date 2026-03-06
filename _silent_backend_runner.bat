<<<<<<< HEAD
@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo ===== BACKEND RUNNER START %DATE% %TIME% =====
echo PWD: %CD%
echo PY:  %LocalAppData%\Programs\Python\Python312\python.exe

set "PY=%LocalAppData%\Programs\Python\Python312\python.exe"
if not exist "%PY%" set "PY=%LocalAppData%\Programs\Python\Python311\python.exe"
if not exist "%PY%" set "PY=%LocalAppData%\Programs\Python\Python310\python.exe"

if not exist "%PY%" (
  echo ERROR: Python not found in LocalAppData\Programs\Python
  exit /b 1
)

if not exist "venv" (
  "%PY%" -m venv venv
)

call venv\Scripts\activate

python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
python -m pip install psycopg2-binary

python -m alembic upgrade head

python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
=======
@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo ===== BACKEND RUNNER START %DATE% %TIME% =====
echo PWD: %CD%
echo PY:  %LocalAppData%\Programs\Python\Python312\python.exe

set "PY=%LocalAppData%\Programs\Python\Python312\python.exe"
if not exist "%PY%" set "PY=%LocalAppData%\Programs\Python\Python311\python.exe"
if not exist "%PY%" set "PY=%LocalAppData%\Programs\Python\Python310\python.exe"

if not exist "%PY%" (
  echo ERROR: Python not found in LocalAppData\Programs\Python
  exit /b 1
)

if not exist "venv" (
  "%PY%" -m venv venv
)

call venv\Scripts\activate

python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
python -m pip install psycopg2-binary

python -m alembic upgrade head

python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
>>>>>>> d1041ea94a192ff91943ffd7c72ff1462eefc385
