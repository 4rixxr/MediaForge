const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('mediaforgeUpdates', {
  version: () => ipcRenderer.invoke('mediaforge:update:version'),
  check: () => ipcRenderer.invoke('mediaforge:update:check'),
  download: () => ipcRenderer.invoke('mediaforge:update:download'),
  install: () => ipcRenderer.invoke('mediaforge:update:install'),
  subscribe: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('mediaforge:update', listener);
    return () => ipcRenderer.removeListener('mediaforge:update', listener);
  }
});
