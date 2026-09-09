@echo off
setlocal EnableExtensions
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\manage-daily-vm-health.ps1" -Action Menu
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" echo [NO-GO] Daily VM health control returned code %RC%.
pause
exit /b %RC%
