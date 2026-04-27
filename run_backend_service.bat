@echo off
setlocal
cd /d "%~dp0"

REM Ensure venv exists
if not exist "venv\Scripts\python.exe" (
  echo [ERROR] Backend venv not found in %cd%\venv
  echo Run 00_SETUP_BACKEND_ENV.bat first.
  pause
  exit /b 1
)

call venv\Scripts\activate

REM Service-mode: no --reload
uvicorn app.main:app --host 127.0.0.1 --port 8001
