@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo Node.js 22+ is required. & pause & exit /b 1)
where yt-dlp >nul 2>&1 || (echo yt-dlp is required. See SETUP_LOCAL.md & pause & exit /b 1)
where ffmpeg >nul 2>&1 || (echo FFmpeg is required. See SETUP_LOCAL.md & pause & exit /b 1)
if not exist node_modules call npm install || (pause & exit /b 1)
if not exist dist call npm run build || (pause & exit /b 1)
start "" "http://127.0.0.1:8787"
node server.js
pause
