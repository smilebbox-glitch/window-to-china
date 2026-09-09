@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ======================================================
echo   MGC - Collect BOTH VM diagnostics / no secrets
echo ======================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\diagnostics-both-vm.ps1"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo [NO-GO] Diagnostics collection failed. See the message above.
  pause
  exit /b %RC%
)

echo.
echo [GO] Diagnostics bundle created. No .env.vm secrets were copied.
pause
exit /b 0
