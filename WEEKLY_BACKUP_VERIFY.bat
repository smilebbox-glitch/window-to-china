@echo off
setlocal EnableExtensions
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\manage-weekly-backup-verify.ps1" -Action menu
exit /b %ERRORLEVEL%
