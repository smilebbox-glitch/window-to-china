@echo off
setlocal EnableExtensions
cd /d "%~dp0"

net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo [NO-GO] Administrator rights are required.
  echo Right-click CONFIGURE_VM_FIREWALL.bat and choose "Run as administrator".
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\configure-vm-firewall.ps1" %*
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo [NO-GO] Firewall configuration failed. Review the message above.
) else (
  echo.
  echo [GO] Firewall boundary configured. START_BOTH_VM can now run.
)
pause
exit /b %RC%
