@echo off
title TwitchDancefloor v0.0.4
echo.
echo   TwitchDancefloor v0.0.4
echo   Music Reactive Light Show Overlay
echo.
echo   Starting server on port 3131...
echo.

cd /d "%~dp0"

if not exist node_modules (
    echo   First run - Installing dependencies...
    call npm install
    echo.
)

echo   Server starting...
timeout /t 2 /nobreak >nul
start "" "http://localhost:3131/admin.html"
echo.
echo   TIP: Select an audio source in the Admin Panel first!
echo   Then add http://localhost:3131/overlay.html as OBS Browser Source.
echo.
node server.js
pause