@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ==============================================
echo   MGC - Stop BOTH VM test services
echo ==============================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-both-vm.ps1"
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  echo [GO] Both VM services are stopped. Data volumes were preserved.
) else (
  echo [NO-GO] One or more VM services could not be stopped cleanly.
)
pause
exit /b %RC%
