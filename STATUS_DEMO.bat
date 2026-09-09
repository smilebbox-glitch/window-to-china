@echo off
setlocal
cd /d "%~dp0"

if not exist ".env.vm" (
  echo [NO-GO] .env.vm not found. Run START_DEMO.bat first.
  pause
  exit /b 1
)

docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml ps
set RC=%ERRORLEVEL%
if not "%RC%"=="0" (
  echo [NO-GO] Could not read demo status.
  pause
  exit /b %RC%
)

echo.
echo Readiness endpoint: http://127.0.0.1:3000/api/ready
pause
