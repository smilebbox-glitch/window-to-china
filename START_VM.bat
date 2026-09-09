@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo   Okno v Kitai - Test VM CPU-only / no AI
echo ==============================================

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [NO-GO] PowerShell is not available.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-vm.ps1"
set RC=%ERRORLEVEL%
if not "%RC%"=="0" (
  echo.
  echo [NO-GO] VM startup failed. See the message above.
  pause
  exit /b %RC%
)

echo.
echo [GO] Okno v Kitai VM is ready.
pause
