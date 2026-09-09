@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ======================================================
echo   MGC - Restore BOTH VM services from backup
echo ======================================================
echo.
echo This operation replaces BOTH pilot databases.
echo A fresh pre-restore safety backup will be created first.
echo Runtime config, audit logs and .env.vm secrets are preserved.
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [NO-GO] PowerShell is not available.
  pause
  exit /b 1
)

set "BACKUP_ARG=%~1"
if defined BACKUP_ARG (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restore-both-vm.ps1" -BackupPath "%BACKUP_ARG%"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restore-both-vm.ps1"
)
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo [NO-GO] Restore did not complete. Read the message above before retrying.
  pause
  exit /b %RC%
)

echo.
echo [GO] Both VM services were restored and passed readiness checks.
echo.
pause
exit /b 0
