@echo off
setlocal EnableExtensions EnableDelayedExpansion
title NEN1090 Marketing (FULL) - START_LOCAL_WRANGLER

cd /d "%~dp0" || goto :fail_nolog
if not exist "logs" mkdir "logs" >nul 2>&1

set "d=%date%"
set "t=%time%"
set "d=%d:/=-%"
set "d=%d:.=-%"
set "d=%d: =%"
set "t=%t::=%"
set "t=%t:.=%"
set "t=%t:,=%"
set "t=%t: =0%"
set "LOGFILE=logs\start_%d%_%t%.log"

call :log "==========================================================="
call :log " START_LOCAL_WRANGLER (FULL MARKETING)"
call :log " WORKDIR: %CD%"
call :log " LOG: %LOGFILE%"
call :log "==========================================================="

if not exist "package.json" (
  call :log "ERROR: package.json not found. Put this .bat in repo root."
  goto :fail
)

where node >> "%LOGFILE%" 2>&1
if errorlevel 1 ( call :log "ERROR: Node.js not found in PATH." & goto :fail )
where npm >> "%LOGFILE%" 2>&1
if errorlevel 1 ( call :log "ERROR: npm not found." & goto :fail )

call :log ""
call :log "[1/3] Install dependencies..."
if exist package-lock.json (
  call :log "Running: npm ci"
  call npm ci >> "%LOGFILE%" 2>&1
) else (
  call :log "Running: npm install"
  call npm install >> "%LOGFILE%" 2>&1
)
if errorlevel 1 ( call :log "ERROR: npm install failed." & goto :fail )

call :log ""
call :log "[2/3] Build (Vite)..."
call npm run build >> "%LOGFILE%" 2>&1
if errorlevel 1 ( call :log "ERROR: npm run build failed." & goto :fail )

call :log ""
call :log "[3/3] Start Wrangler Pages dev (dist) on 8788..."
call :log "Opening browser: http://127.0.0.1:8788/index.html"
start "" "http://127.0.0.1:8788/index.html" >nul 2>&1

call :log "Running: npx wrangler pages dev dist --ip 127.0.0.1 --port 8788"
echo.
echo Wrangler draait nu. Stoppen: Ctrl+C
echo Log: %LOGFILE%
echo.
npx --yes wrangler pages dev dist --ip 127.0.0.1 --port 8788 >> "%LOGFILE%" 2>&1

set "EXITCODE=%ERRORLEVEL%"
call :log "Wrangler exited code: %EXITCODE%"
echo.
echo Klaar. Log: %LOGFILE%
pause
exit /b %EXITCODE%

:fail
echo.
echo =======================
echo START FAILED
echo =======================
echo Log:
echo   %LOGFILE%
echo.
type "%LOGFILE%" | more
echo.
pause
exit /b 1

:fail_nolog
echo.
echo START FAILED (cannot cd to bat folder)
pause
exit /b 1

:log
echo %~1
>> "%LOGFILE%" echo %~1
exit /b 0
