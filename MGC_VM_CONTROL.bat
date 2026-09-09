@echo off
setlocal EnableExtensions
cd /d "%~dp0"

:MENU
cls
echo ======================================================
echo        MGC VM CONTROL - two services / no AI
echo ======================================================
echo.
echo   1. START        Start/rebuild both services
echo   2. STATUS       Check both services and readiness
echo   3. BACKUP       Create verified backup of both DBs
echo   4. DIAGNOSTICS  Create secret-safe diagnostics bundle
echo   5. UPDATE       Backup + safe fast-forward update
echo   6. RESTORE      Controlled restore of both DBs
echo   7. STOP         Stop both services, preserve data
echo   Q. EXIT
echo.
choice /C 1234567Q /N /M "Select: "

if errorlevel 8 goto END
if errorlevel 7 goto STOP
if errorlevel 6 goto RESTORE
if errorlevel 5 goto UPDATE
if errorlevel 4 goto DIAGNOSTICS
if errorlevel 3 goto BACKUP
if errorlevel 2 goto STATUS
if errorlevel 1 goto START

:START
call "%~dp0START_BOTH_VM.bat"
goto MENU

:STATUS
call "%~dp0STATUS_BOTH_VM.bat"
goto MENU

:BACKUP
call "%~dp0BACKUP_BOTH_VM.bat"
goto MENU

:DIAGNOSTICS
call "%~dp0DIAGNOSTICS_BOTH_VM.bat"
goto MENU

:UPDATE
call "%~dp0UPDATE_BOTH_VM.bat"
goto MENU

:RESTORE
call "%~dp0RESTORE_BOTH_VM.bat"
goto MENU

:STOP
call "%~dp0STOP_BOTH_VM.bat"
goto MENU

:END
exit /b 0
