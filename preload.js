const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  quit: () => ipcRenderer.send('quit-app')
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Electron Preload Loaded');
});
