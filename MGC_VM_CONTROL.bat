@echo off
setlocal EnableExtensions
cd /d "%~dp0"

:MENU
cls
echo ======================================================
echo        MGC VM CONTROL - two services / no AI
echo ======================================================
echo.
echo   1. FIREWALL SETUP  Configure restricted host ingress
echo   2. FIREWALL CHECK  Verify host firewall boundary
echo   3. START           Start/rebuild both services
echo   4. STATUS          Check both services and readiness
echo   A. ACCEPTANCE      Full pilot GO/NO-GO gate
echo   R. READINESS       Current status + acceptance drift + backup
echo   O. OPS REPORT      Read-only IT health/capacity/backup report
echo   5. BACKUP          Create verified backup of both DBs
echo   6. DIAGNOSTICS     Create secret-safe diagnostics bundle
echo   7. UPDATE          Backup + safe fast-forward update
echo   8. RESTORE         Controlled restore of both DBs
echo   9. STOP            Stop both services, preserve data
echo   Q. EXIT
echo.
choice /C 123456789AROQ /N /M "Select: "

if errorlevel 13 goto END
if errorlevel 12 goto OPS_REPORT
if errorlevel 11 goto READINESS
if errorlevel 10 goto ACCEPTANCE
if errorlevel 9 goto STOP
if errorlevel 8 goto RESTORE
if errorlevel 7 goto UPDATE
if errorlevel 6 goto DIAGNOSTICS
if errorlevel 5 goto BACKUP
if errorlevel 4 goto STATUS
if errorlevel 3 goto START
if errorlevel 2 goto FIREWALL_CHECK
if errorlevel 1 goto FIREWALL_SETUP

:FIREWALL_SETUP
call "%~dp0CONFIGURE_VM_FIREWALL.bat"
goto MENU

:FIREWALL_CHECK
call "%~dp0CHECK_VM_FIREWALL.bat"
goto MENU

:START
call "%~dp0START_BOTH_VM.bat"
goto MENU

:STATUS
call "%~dp0STATUS_BOTH_VM.bat"
goto MENU

:ACCEPTANCE
call "%~dp0ACCEPT_BOTH_VM.bat"
goto MENU

:READINESS
call "%~dp0READINESS_BOTH_VM.bat"
goto MENU

:OPS_REPORT
call "%~dp0OPS_REPORT_BOTH_VM.bat"
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
