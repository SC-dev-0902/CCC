@echo off
REM start_CCC.bat — Double-click to start CCC on Windows
REM Place this file on your Desktop or wherever convenient.

cd /d "%~dp0\..\.."

REM Read port from .env (default 3000)
set PORT=3000
for /f "tokens=2 delims==" %%a in ('findstr /b "PORT=" .env 2^>nul') do set PORT=%%a

REM Check if already running
netstat -ano 2>nul | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo CCC is already running on port %PORT%.
    start http://localhost:%PORT%
    exit /b 0
)

echo Starting CCC on port %PORT%...
start /b node server.js

REM Wait for server to be ready
set /a attempts=0
:wait_loop
if %attempts% geq 30 goto timeout
timeout /t 1 /nobreak >nul
set /a attempts+=1
curl -s http://localhost:%PORT% >nul 2>&1
if %errorlevel%==0 goto ready
goto wait_loop

:ready
echo CCC is running.
start http://localhost:%PORT%
echo.
echo Press Ctrl+C to stop CCC.
pause >nul
exit /b 0

:timeout
echo Server failed to start within 30 seconds.
exit /b 1
