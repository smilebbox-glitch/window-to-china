@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ==============================================
echo   MGC - Backup BOTH VM test services
echo ==============================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\backup-both-vm.ps1"
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  echo [GO] Dual VM backup completed and verified.
) else (
  echo [NO-GO] Backup failed. See the message above.
)
pause
exit /b %RC%
