@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ======================================================
echo   MGC - Start BOTH test services on one VM / no AI
echo ======================================================
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [NO-GO] PowerShell is not available.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-both-vm.ps1"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo [NO-GO] Dual VM startup failed. See the message above.
  pause
  exit /b %RC%
)

echo.
echo [GO] Both services are ready:
echo      Okno v Kitai - port 3000
echo      MGC Languages - port 8080
echo.
pause
exit /b 0
