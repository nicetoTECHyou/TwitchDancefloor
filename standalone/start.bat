@echo off
title TwitchDancefloor v0.0.1
echo.
echo   ████████╗██╗██╗  ██╗███████╗███████╗███████╗███╗   ██╗███████╗
echo   ╚══██╔══╝██║██║ ██╔╝██╔════╝██╔════╝██╔════╝████╗  ██║██╔════╝
echo      ██║   ██║█████╔╝ █████╗  ███████╗█████╗  ██╔██╗ ██║█████╗  
echo      ██║   ██║██╔═██╗ ██╔══╝  ╚════██║██╔══╝  ██║╚██╗██║██╔══╝  
echo      ██║   ██║██║  ██╗███████╗███████║███████╗██║ ╚████║███████╗
echo      ╚═╝   ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝
echo.
echo   [v0.0.1] Music Reactive Light Show Overlay
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
node server.js
pause
