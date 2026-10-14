const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const languageCodes = new Set(['id','en','zh','th','ja']);
ipcMain.handle('mediaforge:language:get', () => {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'language.json'), 'utf8')).language;
    return languageCodes.has(value) ? value : null;
  } catch { return null; }
});
ipcMain.handle('mediaforge:language:set', (_event, language) => {
  if (!languageCodes.has(language)) throw Error('Unsupported language');
  const root = app.getPath('userData');
  fs.mkdirSync(root, {recursive:true});
  fs.writeFileSync(path.join(root, 'language.json'), JSON.stringify({language}), 'utf8');
  return true;
});

let window;
let updater;
let updateBusy = false;
let updateDownloaded = false;
function updateMessage(state, detail = {}) {
  if (window && !window.isDestroyed()) window.webContents.send('mediaforge:update', {state, ...detail});
}
function configureUpdates() {
  if (!app.isPackaged || process.platform !== 'win32' || process.env.PORTABLE_EXECUTABLE_FILE) return;
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
function bundledBin(name) {
  const root = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '../vendor/win');
  return path.join(root, 'bin', name + '.exe');
}
const {registerBurner}=require('./burner.cjs');
registerBurner({app,ipcMain,dialog,getWindow:()=>window,bundledBin});
require('./media.cjs').registerMedia({ipcMain,getWindow:()=>window,bundledBin});
async function start() {
  if (process.platform !== 'win32') {
    dialog.showErrorBox('MediaForge Studio', 'Paket desktop ini ditujukan untuk Windows.');
    app.quit();
    return;
  }
  for (const bin of ['yt-dlp', 'ffmpeg', 'ffprobe', 'node']) {
    if (!fs.existsSync(bundledBin(bin))) {
      throw Error(`${bin}.exe tidak ditemukan. Gunakan installer/portable hasil GitHub Actions, bukan ZIP source code.`);
    }
  }
  process.env.MEDIAFORGE_HOST = '127.0.0.1';
  process.env.MEDIAFORGE_YTDLP = bundledBin('yt-dlp');
  process.env.MEDIAFORGE_FFMPEG = bundledBin('ffmpeg');
  process.env.MEDIAFORGE_FFPROBE = bundledBin('ffprobe');
  process.env.MEDIAFORGE_JS_RUNTIME = 'node:' + bundledBin('node');
  const {startServer} = await import('../server.js');
  const server = await startServer({port:0, host:'127.0.0.1'});
  const {port} = server.address();
  app.once('will-quit', () => { server.close(); server.closeAllConnections(); });
  const url = `http://127.0.0.1:${port}`;
  const smoke=process.argv.includes('--smoke-test');
  window = new BrowserWindow({
    width: 1320, height: 880, minWidth: 880, minHeight: 630,
    show: false,
    webPreferences: {nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, preload: path.join(__dirname, 'preload.cjs')},
    backgroundColor: '#101915',
  });
  if(!smoke)window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({url: target}) => {
    if (/^https:\/\//.test(target)) shell.openExternal(target);
    return {action: 'deny'};
  });
  window.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith(url + '/')) { event.preventDefault(); if (/^https:\/\//.test(target)) shell.openExternal(target); }
  });
  await window.loadURL(url);
  if(smoke){
    require('electron-updater');
    const result=await window.webContents.executeJavaScript(`(async()=>{
      if(!window.mediaforgeMedia?.convert)throw Error('Native media preload bridge missing');
      const data=new ArrayBuffer(44+44100*2),v=new DataView(data),text=(offset,s)=>{for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i));};
      text(0,'RIFF');v.setUint32(4,data.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,44100,true);v.setUint32(28,88200,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,88200,true);
      const result=await window.mediaforgeMedia.convert('packaged-smoke',{kind:'audio',format:'opus',options:{bitrate:128,sampleRate:48000,channels:2},bytes:data});
      return {magic:new TextDecoder().decode(result.bytes.slice(0,4)),length:result.bytes.length};
    })()`);
    if(result.magic!=='OggS'||result.length<100)throw Error('Packaged native conversion failed');
    console.log('PASS: packaged Electron UI/preload/IPC, bundled FFmpeg Opus conversion, and updater.');app.exit(0);return;
  }
  configureUpdates();
  // Allow the UI to subscribe before checking; errors never prevent app launch.
  setTimeout(() => { if (updater) updater.checkForUpdates().catch(err => updateMessage('error', {message:String(err.message || err)})); }, 2500);
}
app.whenReady().then(() => start().catch(error => {
  if (!process.argv.includes('--smoke-test')) dialog.showErrorBox('MediaForge Studio', String(error.message || error));
  console.error(error);
  app.exit(1);
}));
app.on('window-all-closed', () => app.quit());
