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
) else (
  echo Source package mode detected.
  if exist "okno-v-kitai-image.tar" (
    echo Disabling bundled/stale offline image so the current downloaded source is rebuilt...
    if exist "okno-v-kitai-image.tar.disabled-by-start" del /q "okno-v-kitai-image.tar.disabled-by-start" >nul 2>nul
    ren "okno-v-kitai-image.tar" "okno-v-kitai-image.tar.disabled-by-start"
    if errorlevel 1 (
      echo.
      echo ERROR: Could not disable okno-v-kitai-image.tar.
      echo Close programs using that file or remove it manually, then run START.bat again.
      pause
      exit /b 1
    )
  )
)

echo Verifying that this package contains the latest calendar and Trip.com changes...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\verify-calendar-ui.ps1"
if errorlevel 1 (
  echo.
  echo ERROR: This folder does not contain the expected latest UI source.
  echo Download/extract a fresh copy of main into a NEW folder and run START.bat there.
  pause
  exit /b 1
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

echo Verifying the actually running calendar page...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\verify-calendar-ui.ps1" -Runtime
if errorlevel 1 (
  echo.
  echo ERROR: A stale runtime was detected even though the source is current.
  echo Stopping the incorrect containers so they cannot be mistaken for the new version...
  docker compose down >nul 2>nul
  echo Run START.bat again. If this repeats, send the full console output.
  pause
  exit /b 1
)

echo.
echo Okno v Kitai is ready and the current calendar UI was verified.
echo If another PC still cannot open the LAN URL, run START.bat once as Administrator
echo so Windows Firewall can allow port 3000 for the local network.
pause
