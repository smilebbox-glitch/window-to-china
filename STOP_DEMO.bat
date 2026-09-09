@echo off
setlocal
cd /d "%~dp0"

if not exist ".env.vm" (
  echo [INFO] .env.vm not found. Demo is probably not running.
  pause
  exit /b 0
)

docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml down
set RC=%ERRORLEVEL%
if not "%RC%"=="0" (
  echo [NO-GO] Could not stop demo containers cleanly.
  pause
  exit /b %RC%
)

echo [GO] Demo containers stopped. Persistent Docker volume was preserved.
pause
