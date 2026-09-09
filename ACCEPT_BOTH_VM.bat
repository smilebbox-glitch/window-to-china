@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ======================================================
echo   MGC - Pilot acceptance gate / two services / no AI
echo ======================================================
echo.
echo Verifies host firewall, service readiness, ingress isolation
echo and the CPU-only / no-AI runtime contract.
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [NO-GO] PowerShell is not available.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\accept-both-vm.ps1"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo [NO-GO] VM pilot acceptance failed. Do not invite users yet.
  pause
  exit /b %RC%
)

echo.
echo [GO] VM pilot acceptance passed. The temporary test VM is ready for approved users.
echo.
pause
exit /b 0
