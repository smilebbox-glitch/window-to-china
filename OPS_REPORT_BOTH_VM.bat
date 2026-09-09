@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ======================================================
echo  MGC VM OPERATIONS REPORT - two services / no AI
echo ======================================================
echo.
echo Read-only check: runtime, acceptance, disk and backup freshness.
echo No services or databases are modified by this operation.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ops-report-both-vm.ps1"
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (
  echo Operations report completed.
) else (
  echo [NO-GO] Operations report returned code %RC%.
)
pause
exit /b %RC%
