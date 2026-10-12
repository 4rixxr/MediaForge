@echo off
setlocal
cd /d "%~dp0"
title MediaForge Studio - Build Windows Installer
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 22 belum tersedia. Install Node.js LTS dari https://nodejs.org/
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm tidak ditemukan. Perbaiki instalasi Node.js.
  pause
  exit /b 1
)
echo [1/3] Install locked dependencies...
call npm ci --no-audit --no-fund
if errorlevel 1 goto failed
call npm run verify:electron
if errorlevel 1 goto failed
echo [2/3] Ambil binary Windows yt-dlp / FFmpeg...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\fetch-windows-tools.ps1"
if errorlevel 1 goto failed
echo [3/3] Build, stage, dan kemasi installer...
call npm run package:win
if errorlevel 1 goto failed
echo.
echo SUCCESS! Installer ada di folder release\
explorer.exe "%~dp0release"
pause
exit /b 0
:failed
echo.
echo BUILD GAGAL. Lihat pesan kesalahan di atas, lalu kirim screenshot/log.
pause
exit /b 1
