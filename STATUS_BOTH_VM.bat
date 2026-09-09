@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ==============================================
echo   MGC - Status of BOTH VM test services
echo ==============================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\status-both-vm.ps1"
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  echo [GO] Both VM services are healthy.
) else (
  echo [NO-GO] One or more VM services need attention.
)
pause
exit /b %RC%
