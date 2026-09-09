@echo off
setlocal EnableExtensions
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\host-firewall-preflight.ps1"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo [NO-GO] Host firewall preflight failed. Do not start the pilot until this is corrected.
) else (
  echo.
  echo [GO] Host firewall preflight passed.
)
pause
exit /b %RC%
