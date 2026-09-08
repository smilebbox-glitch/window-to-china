@echo off
setlocal
cd /d "%~dp0"

echo Updating project from GitHub...
git pull --ff-only origin main
if errorlevel 1 (
  echo.
  echo [NO-GO] Git update failed. Local files were not overwritten.
  pause
  exit /b 10
)

echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-corporate.ps1"
set RC=%ERRORLEVEL%

if not "%RC%"=="0" (
  echo.
  echo [NO-GO] Corporate HTTPS/SSO launcher stopped with code %RC%.
  echo Correct the IT configuration shown above and run this file again.
  pause
  exit /b %RC%
)

echo.
echo Corporate HTTPS/SSO profile started successfully.
pause
exit /b 0
