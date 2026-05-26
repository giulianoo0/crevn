const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  listGeneratedImages: (threadId) => ipcRenderer.invoke('generation:listGeneratedImages', threadId),
  listProjectsWithThreads: () => ipcRenderer.invoke('generation:listProjectsWithThreads'),
  listReferences: () => ipcRenderer.invoke('generation:listReferences'),
  createReference: (payload) => ipcRenderer.invoke('generation:createReference', payload),
  ensureProjectThreadWorkspace: () => ipcRenderer.invoke('generation:ensureProjectThreadWorkspace'),
  createProject: (projectName) => ipcRenderer.invoke('generation:createProject', projectName),
  createThread: (projectId) => ipcRenderer.invoke('generation:createThread', projectId),
  renameProject: (projectId, name) => ipcRenderer.invoke('generation:renameProject', projectId, name),
  renameThread: (threadId, name) => ipcRenderer.invoke('generation:renameThread', threadId, name),
  deleteProject: (projectId) => ipcRenderer.invoke('generation:deleteProject', projectId),
  deleteThread: (threadId) => ipcRenderer.invoke('generation:deleteThread', threadId),
  generateImages: (payload) => ipcRenderer.invoke('generation:generateImages', payload),
});
