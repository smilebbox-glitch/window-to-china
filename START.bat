@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo   Okno v Kitai - LAN start
echo ==============================================

if exist ".git" (
  where git >nul 2>nul
  if errorlevel 1 (
    echo.
    echo ERROR: This is a Git checkout, but Git is not available in PATH.
    echo START will not launch an unverified older local copy.
    echo Install/repair Git, then run START.bat again.
    pause
    exit /b 1
  )

  echo Updating project from GitHub...
  git pull --ff-only origin main
  if errorlevel 1 (
    echo.
    echo ERROR: Could not update the project from GitHub.
    echo START will not launch an older local copy.
    echo Resolve the Git/network issue above, then run START.bat again.
    pause
    exit /b 1
  )

  echo Active source revision:
  git rev-parse --short=12 HEAD
)

echo Checking local configuration...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\repair-env.ps1"
set REPAIR_RC=%ERRORLEVEL%
if not "%REPAIR_RC%"=="0" (
  echo.
  echo Local configuration repair failed. See the message above.
  pause
  exit /b %REPAIR_RC%
)

echo Starting Okno v Kitai for this PC and other PCs on the same LAN...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-lan.ps1"
set RC=%ERRORLEVEL%
if not "%RC%"=="0" (
  echo.
  echo Startup failed. See the message above.
  pause
  exit /b %RC%
)

echo.
echo Okno v Kitai is ready.
echo If another PC still cannot open the LAN URL, run START.bat once as Administrator
echo so Windows Firewall can allow port 3000 for the local network.
pause
