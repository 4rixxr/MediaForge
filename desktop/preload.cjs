const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('mediaforgePreferences', {
  getLanguage: () => ipcRenderer.invoke('mediaforge:language:get'),
  setLanguage: language => ipcRenderer.invoke('mediaforge:language:set', language),
});
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

contextBridge.exposeInMainWorld('mediaforgeBurner', {
 status:()=>ipcRenderer.invoke('mediaforge:burner:status'),
 choose:()=>ipcRenderer.invoke('mediaforge:burner:choose'),
 build:request=>ipcRenderer.invoke('mediaforge:burner:build',request),
 save:id=>ipcRenderer.invoke('mediaforge:burner:save',id),
 burn:(id,drive)=>ipcRenderer.invoke('mediaforge:burner:burn',id,drive),
 subscribe:callback=>{const listener=(_event,data)=>callback(data);ipcRenderer.on('mediaforge:burner:progress',listener);return()=>ipcRenderer.removeListener('mediaforge:burner:progress',listener);},
});

contextBridge.exposeInMainWorld('mediaforgeMedia', {
 inspect:bytes=>ipcRenderer.invoke('mediaforge:media:inspect',bytes),
 convert:(id,request)=>ipcRenderer.invoke('mediaforge:media:convert',id,request),
 subscribe:callback=>{const listener=(_event,data)=>callback(data);ipcRenderer.on('mediaforge:media:progress',listener);return()=>ipcRenderer.removeListener('mediaforge:media:progress',listener);},
});
