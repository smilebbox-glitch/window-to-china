@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ======================================================
echo   MGC - Safely update BOTH VM services
echo   Backup - fast-forward only - rebuild - readiness
echo ======================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update-both-vm.ps1"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo [NO-GO] Update did not complete cleanly. Read the message above.
  echo Existing local changes are never force-reset by this launcher.
  pause
  exit /b %RC%
)

echo.
echo [GO] Both VM services are updated and ready.
pause
exit /b 0
