@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo   Okno v Kitai - LAN start
echo ==============================================

where git >nul 2>nul
if "%ERRORLEVEL%"=="0" if exist ".git" (
  echo Updating project from GitHub...
  git pull --ff-only origin main
  if not "%ERRORLEVEL%"=="0" echo WARNING: Git update was skipped. Starting current local copy.
)

echo Synchronizing local pilot version...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\sync-version.ps1"
if not "%ERRORLEVEL%"=="0" (
  echo.
  echo Version synchronization failed. See the message above.
  pause
  exit /b %ERRORLEVEL%
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
