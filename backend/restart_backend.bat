@echo off
echo Restarting backend server...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq backend*" 2>nul
timeout /t 2 /nobreak >nul
cd /d "%~dp0"
start "backend" cmd /k "npm start"
echo Backend server restarted!
