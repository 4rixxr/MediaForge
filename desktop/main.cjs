const { app, BrowserWindow, shell, dialog } = require('electron');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');

let window;
function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}
function bundledBin(name) {
  const root = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '../vendor/win');
  return path.join(root, 'bin', name + '.exe');
}
async function start() {
  if (process.platform !== 'win32') {
    dialog.showErrorBox('MediaForge Studio', 'Paket desktop ini ditujukan untuk Windows.');
    app.quit();
    return;
  }
  for (const bin of ['yt-dlp', 'ffmpeg', 'ffprobe']) {
    if (!fs.existsSync(bundledBin(bin))) {
      dialog.showErrorBox('Komponen belum lengkap', `${bin}.exe tidak ditemukan. Gunakan paket portable hasil GitHub Actions, bukan ZIP source code.`);
      app.quit();
      return;
    }
  }
  const port = await availablePort();
  process.env.MEDIAFORGE_PORT = String(port);
  process.env.MEDIAFORGE_HOST = '127.0.0.1';
  process.env.MEDIAFORGE_YTDLP = bundledBin('yt-dlp');
  process.env.MEDIAFORGE_FFMPEG = bundledBin('ffmpeg');
  process.env.MEDIAFORGE_FFPROBE = bundledBin('ffprobe');
  await import('../server.js');
  const url = `http://127.0.0.1:${port}`;
  // Wait for the internal HTTP server; no manual localhost setup is required.
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { const response = await fetch(url); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  if (!ready) throw Error('Server internal MediaForge tidak berhasil dimulai.');
  window = new BrowserWindow({
    width: 1320, height: 880, minWidth: 880, minHeight: 630,
    show: false,
    backgroundColor: '#101915',
    webPreferences: {nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true},
  });
  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({url: target}) => {
    if (/^https:\/\//.test(target)) shell.openExternal(target);
    return {action: 'deny'};
  });
  window.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith(url + '/')) { event.preventDefault(); if (/^https:\/\//.test(target)) shell.openExternal(target); }
  });
  await window.loadURL(url);
}
app.whenReady().then(() => start().catch(error => {
  dialog.showErrorBox('MediaForge Studio', String(error.message || error));
  app.quit();
}));
app.on('window-all-closed', () => app.quit());
