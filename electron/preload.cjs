const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  listGeneratedImages: (threadId) => ipcRenderer.invoke('generation:listGeneratedImages', threadId),
  listProjectsWithThreads: () => ipcRenderer.invoke('generation:listProjectsWithThreads'),
  listReferences: () => ipcRenderer.invoke('generation:listReferences'),
  createReference: (payload) => ipcRenderer.invoke('generation:createReference', payload),
  createEnvironmentReference: (payload) => ipcRenderer.invoke('generation:createEnvironmentReference', payload),
  createReferenceCollection: (payload) => ipcRenderer.invoke('generation:createReferenceCollection', payload),
  updateReference: (payload) => ipcRenderer.invoke('generation:updateReference', payload),
  updateEnvironmentReference: (payload) => ipcRenderer.invoke('generation:updateEnvironmentReference', payload),
  updateReferenceCollection: (payload) => ipcRenderer.invoke('generation:updateReferenceCollection', payload),
  deleteReference: (payload) => ipcRenderer.invoke('generation:deleteReference', payload),
  describeReferenceCollection: (payload) => ipcRenderer.invoke('generation:describeReferenceCollection', payload),
  ensureProjectThreadWorkspace: () => ipcRenderer.invoke('generation:ensureProjectThreadWorkspace'),
  createProject: (projectName) => ipcRenderer.invoke('generation:createProject', projectName),
  createThread: (projectId) => ipcRenderer.invoke('generation:createThread', projectId),
  renameProject: (projectId, name) => ipcRenderer.invoke('generation:renameProject', projectId, name),
  updateProjectSettings: (projectId, payload) =>
    ipcRenderer.invoke('generation:updateProjectSettings', projectId, payload),
  renameThread: (threadId, name) => ipcRenderer.invoke('generation:renameThread', threadId, name),
  deleteProject: (projectId) => ipcRenderer.invoke('generation:deleteProject', projectId),
  deleteThread: (threadId) => ipcRenderer.invoke('generation:deleteThread', threadId),
  generateImages: (payload) => ipcRenderer.invoke('generation:generateImages', payload),
  listSceneGroups: (threadId) => ipcRenderer.invoke('generation:listSceneGroups', threadId),
  createSceneGroup: (threadId, input) => ipcRenderer.invoke('generation:createSceneGroup', threadId, input),
  updateSceneGroup: (sceneGroupId, input) => ipcRenderer.invoke('generation:updateSceneGroup', sceneGroupId, input),
  createSceneFrame: (sceneGroupId, input) => ipcRenderer.invoke('generation:createSceneFrame', sceneGroupId, input),
  updateSceneFrame: (sceneFrameId, input) => ipcRenderer.invoke('generation:updateSceneFrame', sceneFrameId, input),
  saveSceneFrameReferences: (sceneFrameId, references) =>
    ipcRenderer.invoke('generation:saveSceneFrameReferences', sceneFrameId, references),
  generateSceneGroup: (input) => ipcRenderer.invoke('generation:generateSceneGroup', input),
  structureScenePrompt: (input) => ipcRenderer.invoke('generation:structureScenePrompt', input),
  cancelSceneGroupGeneration: (sceneGroupId) =>
    ipcRenderer.invoke('generation:cancelSceneGroupGeneration', sceneGroupId),
  copyGeneratedImage: (imageId) => ipcRenderer.invoke('generation:copyGeneratedImage', imageId),
  downloadGeneratedImage: (imageId) => ipcRenderer.invoke('generation:downloadGeneratedImage', imageId),
  deleteGeneratedImage: (imageId) => ipcRenderer.invoke('generation:deleteGeneratedImage', imageId),
  subscribeToScenePlan: (listener) => {
    const wrappedListener = (_event, payload) => listener(payload);
    ipcRenderer.on('generation:scenePlan', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:scenePlan', wrappedListener);
    };
  },
  subscribeToSceneFrameReady: (listener) => {
    const wrappedListener = (_event, payload) => listener(payload);
    ipcRenderer.on('generation:sceneFrameReady', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:sceneFrameReady', wrappedListener);
    };
  },
});
