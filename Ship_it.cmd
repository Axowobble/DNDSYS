@echo off
setlocal
title DnD Party Tracker - Auto Deployer
color 0A

echo ========================================================
echo       D&D PARTY TRACKER - DEPLOYMENT WIZARD
echo ========================================================
echo.
echo This script will:
echo 1. Configure your rpg-system.js automatically
echo 2. Initialize the Git repository
echo 3. Push everything to GitHub
echo.

:: 1. Check for Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in your PATH.
    echo Please install Git from https://git-scm.com/ and try again.
    pause
    exit /b
)

:: 2. Get Repo URL
echo.
echo Please go to GitHub, create a new Public Repository.
set /p "REPO_URL=Paste your HTTPS Repository URL here (e.g., https://github.com/User/Repo.git): "

:: Remove quotes if user added them
set "REPO_URL=%REPO_URL:"=%"

:: 3. Extract User and Repo Name using PowerShell for reliability
for /f "delims=" %%I in ('powershell -command "$u='%REPO_URL%'; $p=$u -replace 'https://github.com/', '' -replace '.git', ''; $parts=$p.split('/'); write-host $parts[0]"') do set REPO_OWNER=%%I
for /f "delims=" %%I in ('powershell -command "$u='%REPO_URL%'; $p=$u -replace 'https://github.com/', '' -replace '.git', ''; $parts=$p.split('/'); write-host $parts[1]"') do set REPO_NAME=%%I

echo.
echo [Config Detected]
echo Owner: %REPO_OWNER%
echo Repo:  %REPO_NAME%
echo.

:: 4. Update rpg-system.js automatically
echo [1/4] Updating rpg-system.js configurations...
if exist rpg-system.js (
    powershell -Command "(Get-Content rpg-system.js) -replace 'const REPO_OWNER = .*;', 'const REPO_OWNER = ''%REPO_OWNER%'';' -replace 'const REPO_NAME = .*;', 'const REPO_NAME = ''%REPO_NAME%'';' | Set-Content rpg-system.js"
    echo     - Configuration updated.
) else (
    echo     [WARNING] rpg-system.js not found! Skipping config update.
)

:: 5. Create players.json if missing
echo [2/4] Checking database...
if not exist players.json (
    echo [  { "id": 1, "name": "Test Hero", "class": "Paladin", "exp": 0, "level": 1 } ] > players.json
    echo     - Created default players.json
)

:: 6. Git Operations
echo [3/4] Initializing Repository...
rmdir /s /q .git >nul 2>nul
git init
git branch -M main
git remote add origin %REPO_URL%

echo [4/4] Pushing to GitHub...
git add .
git commit -m "Initial Deploy via Wizard"
git push -u origin main

echo.
echo ========================================================
echo                DEPLOYMENT COMPLETE
echo ========================================================
echo.
echo Your site should be live at:
echo https://%REPO_OWNER%.github.io/%REPO_NAME%/
echo.
echo (Remember to go to Repo Settings - Pages and set Source to 'main')
echo.
pause