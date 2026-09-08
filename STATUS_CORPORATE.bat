@echo off
setlocal
cd /d "%~dp0"
if not exist ".env.corporate" (
  echo [NO-GO] .env.corporate does not exist yet.
  pause
  exit /b 20
)
docker compose --project-name okno-corporate --env-file .env.corporate -f compose.corporate.yaml ps
pause
