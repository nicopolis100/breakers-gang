const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('breakers', {
  loadData: () => ipcRenderer.invoke('data-load'),
  saveData: (data) => ipcRenderer.invoke('data-save', data),
  dataPath: () => ipcRenderer.invoke('data-path'),
  exportData: (data) => ipcRenderer.invoke('data-export', data),
  importData: () => ipcRenderer.invoke('data-import'),
  openBackups: () => ipcRenderer.invoke('open-backups'),
  getAutostart: () => ipcRenderer.invoke('autostart-get'),
  setAutostart: (v) => ipcRenderer.invoke('autostart-set', v),
  appVersion: () => ipcRenderer.invoke('app-version'),
  updateState: () => ipcRenderer.invoke('update-state'),
  checkUpdate: () => ipcRenderer.invoke('update-check'),
  installUpdate: () => ipcRenderer.invoke('update-install'),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_, s) => cb(s)),
});

contextBridge.exposeInMainWorld('winctl', {
  minimize: () => ipcRenderer.send('win-minimize'),
  maximize: () => ipcRenderer.send('win-maximize'),
  close:    () => ipcRenderer.send('win-close'),
});
