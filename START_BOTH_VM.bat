@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ======================================================
echo   MGC - Start BOTH test services on one VM / no AI
echo ======================================================
echo.
echo Prerequisite: CONFIGURE_VM_FIREWALL.bat must have been
echo run as Administrator for the approved corporate subnet.
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
  echo If the host firewall check failed, run CONFIGURE_VM_FIREWALL.bat as Administrator.
  pause
  exit /b %RC%
)

echo.
echo [GO] Both services are ready behind the approved host firewall boundary:
echo      Okno v Kitai - port 3000
echo      MGC Languages - port 8080
echo.
echo Before inviting pilot users, run ACCEPT_BOTH_VM.bat once.
echo It verifies firewall + readiness + ingress isolation + no-AI runtime state.
echo.
pause
exit /b 0
