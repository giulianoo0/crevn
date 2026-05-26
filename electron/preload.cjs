const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  listGeneratedImages: () => ipcRenderer.invoke('generation:listGeneratedImages'),
  generateImages: (payload) => ipcRenderer.invoke('generation:generateImages', payload),
});
