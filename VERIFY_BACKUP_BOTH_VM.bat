@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ======================================================
echo  MGC VM BACKUP RESTOREABILITY - NON-DESTRUCTIVE
echo ======================================================
echo This verifies the latest backup without changing either pilot database.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\verify-backup-both-vm.ps1"
set RC=%ERRORLEVEL%
echo.
if "%RC%"=="0" (
  echo [GO] Latest backup can be restored in isolated verification containers.
) else (
  echo [NO-GO] Backup restoreability verification failed. Review the output before relying on this backup.
)
pause
exit /b %RC%
