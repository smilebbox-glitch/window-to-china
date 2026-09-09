@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo   Okno v Kitai - launcher recovery
echo ==============================================

where git >nul 2>nul
if not "%ERRORLEVEL%"=="0" (
  echo Git is not available in PATH.
  pause
  exit /b 1
)

if not exist ".git" (
  echo This folder is not a Git working copy.
  pause
  exit /b 1
)

echo Fetching the latest launcher files from GitHub...
git fetch origin main
if not "%ERRORLEVEL%"=="0" (
  echo Could not fetch origin/main. Check network access to GitHub.
  pause
  exit /b 1
)

echo Restoring managed launcher files only...
git restore --source=origin/main --worktree -- START.bat scripts/start-lan.ps1 scripts/one-click-start.ps1 scripts/repair-env.ps1 scripts/env-file-utils.ps1
if not "%ERRORLEVEL%"=="0" (
  echo Launcher restore failed.
  pause
  exit /b 1
)

echo Updating the rest of the project...
git pull --ff-only origin main
if not "%ERRORLEVEL%"=="0" (
  echo WARNING: Full project update is still blocked by other local tracked changes.
  echo The managed launcher files were restored and can be used now.
)

echo.
echo Starting Okno v Kitai...
call START.bat
exit /b %ERRORLEVEL%
