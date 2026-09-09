@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo   Okno v Kitai - FULL DEMO
echo   CPU-only / no generative AI
echo ==============================================

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [NO-GO] PowerShell is not available.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-demo.ps1"
set RC=%ERRORLEVEL%
if not "%RC%"=="0" (
  echo.
  echo [NO-GO] Full demo startup failed. See the message above.
  pause
  exit /b %RC%
)

echo.
echo [GO] Full demo is ready and the browser should be open.
echo Guide: DEMO_FULL_SHOWCASE.md
pause
