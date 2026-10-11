const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');

let window;
let updater;
let updateBusy = false;
let updateDownloaded = false;
function updateMessage(state, detail = {}) {
  if (window && !window.isDestroyed()) window.webContents.send('mediaforge:update', {state, ...detail});
}
function configureUpdates() {
  if (!app.isPackaged || process.platform !== 'win32') return;
  try {
    const {autoUpdater} = require('electron-updater');
    updater = autoUpdater;
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.on('checking-for-update', () => updateMessage('checking'));
    updater.on('update-available', info => updateMessage('available', {version:info.version, notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : ''}));
    updater.on('update-not-available', () => updateMessage('current', {version:app.getVersion()}));
    updater.on('download-progress', p => updateMessage('downloading', {percent:Math.round(p.percent)}));
    updater.on('update-downloaded', info => { updateDownloaded = true; updateMessage('downloaded', {version:info.version}); });
    updater.on('error', err => updateMessage('error', {message:String(err.message || err)}));
  } catch (err) { updateMessage('error', {message:String(err.message || err)}); }
}
ipcMain.handle('mediaforge:update:version', () => app.getVersion());
ipcMain.handle('mediaforge:update:check', async () => {
  if (!updater) return {ok:false, message:'Updates are available in the installed Windows app only.'};
  if (updateBusy) return {ok:false, message:'An update operation is already running.'};
  updateBusy = true;
  try { await updater.checkForUpdates(); return {ok:true}; }
  catch (e) { updateMessage('error', {message:String(e.message || e)}); return {ok:false, message:String(e.message || e)}; }
  finally { updateBusy = false; }
});
ipcMain.handle('mediaforge:update:download', async () => {
  if (!updater) return {ok:false};
  if (updateBusy) return {ok:false};
  updateBusy = true;
  try { await updater.downloadUpdate(); return {ok:true}; }
  catch (e) { updateMessage('error', {message:String(e.message || e)}); return {ok:false, message:String(e.message || e)}; }
  finally { updateBusy = false; }
});
ipcMain.handle('mediaforge:update:install', () => {
  if (!updater || !updateDownloaded) return {ok:false, message:'No downloaded update is ready.'};
  setImmediate(() => updater.quitAndInstall(false, true));
  return {ok:true};
});
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
    webPreferences: {nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, preload: path.join(__dirname, 'preload.cjs')},
    backgroundColor: '#101915',
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
  configureUpdates();
  // Allow the UI to subscribe before checking; errors never prevent app launch.
  setTimeout(() => { if (updater) updater.checkForUpdates().catch(err => updateMessage('error', {message:String(err.message || err)})); }, 2500);
}
app.whenReady().then(() => start().catch(error => {
  dialog.showErrorBox('MediaForge Studio', String(error.message || error));
  app.quit();
}));
app.on('window-all-closed', () => app.quit());
