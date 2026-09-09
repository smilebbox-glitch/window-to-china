@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ======================================================
echo   MGC - Pilot readiness / acceptance drift report
echo ======================================================
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [NO-GO] PowerShell is not available.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\readiness-both-vm.ps1"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo [NO-GO] Pilot readiness needs attention. If ACCEPTANCE is STALE, run ACCEPT_BOTH_VM.bat again after resolving any status issue.
  pause
  exit /b %RC%
)

echo.
echo [GO] Current deployment still matches the latest accepted pilot state.
echo.
pause
exit /b 0
