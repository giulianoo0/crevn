const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getUpdateStatus: () => ipcRenderer.invoke('app:getUpdateStatus'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
  listGeneratedImages: (threadId) => ipcRenderer.invoke('generation:listGeneratedImages', threadId),
  listProjectsWithThreads: () => ipcRenderer.invoke('generation:listProjectsWithThreads'),
  listReferences: () => ipcRenderer.invoke('generation:listReferences'),
  listDirectorChats: (threadId) => ipcRenderer.invoke('generation:listDirectorChats', threadId),
  createDirectorChat: (threadId) => ipcRenderer.invoke('generation:createDirectorChat', threadId),
  renameDirectorChat: (chatId, title) => ipcRenderer.invoke('generation:renameDirectorChat', chatId, title),
  deleteDirectorChat: (chatId) => ipcRenderer.invoke('generation:deleteDirectorChat', chatId),
  listDirectorMessages: (chatId) => ipcRenderer.invoke('generation:listDirectorMessages', chatId),
  sendDirectorMessage: (payload) => ipcRenderer.invoke('generation:sendDirectorMessage', payload),
  approveDirectorAction: (payload) => ipcRenderer.invoke('generation:approveDirectorAction', payload),
  declineDirectorAction: (payload) => ipcRenderer.invoke('generation:declineDirectorAction', payload),
  cancelDirectorChat: (chatId) => ipcRenderer.invoke('generation:cancelDirectorChat', chatId),
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
  exportProject: (projectId) => ipcRenderer.invoke('generation:exportProject', projectId),
  exportThread: (threadId) => ipcRenderer.invoke('generation:exportThread', threadId),
  exportReference: (payload) => ipcRenderer.invoke('generation:exportReference', payload),
  importCrenv: (targetProjectId) => ipcRenderer.invoke('generation:importCrenv', targetProjectId),
  importReference: () => ipcRenderer.invoke('generation:importReference'),
  renameThread: (threadId, name) => ipcRenderer.invoke('generation:renameThread', threadId, name),
  deleteProject: (projectId) => ipcRenderer.invoke('generation:deleteProject', projectId),
  deleteThread: (threadId) => ipcRenderer.invoke('generation:deleteThread', threadId),
  generateImages: (payload) => ipcRenderer.invoke('generation:generateImages', payload),
  listSceneGroups: (threadId) => ipcRenderer.invoke('generation:listSceneGroups', threadId),
  createSceneGroup: (threadId, input) => ipcRenderer.invoke('generation:createSceneGroup', threadId, input),
  updateSceneGroup: (sceneGroupId, input) => ipcRenderer.invoke('generation:updateSceneGroup', sceneGroupId, input),
  deleteSceneGroup: (sceneGroupId) => ipcRenderer.invoke('generation:deleteSceneGroup', sceneGroupId),
  createSceneFrame: (sceneGroupId, input) => ipcRenderer.invoke('generation:createSceneFrame', sceneGroupId, input),
  updateSceneFrame: (sceneFrameId, input) => ipcRenderer.invoke('generation:updateSceneFrame', sceneFrameId, input),
  deleteSceneFrame: (sceneFrameId) => ipcRenderer.invoke('generation:deleteSceneFrame', sceneFrameId),
  saveSceneFrameReferences: (sceneFrameId, references) =>
    ipcRenderer.invoke('generation:saveSceneFrameReferences', sceneFrameId, references),
  generateSceneGroup: (input) => ipcRenderer.invoke('generation:generateSceneGroup', input),
  structureScenePrompt: (input) => ipcRenderer.invoke('generation:structureScenePrompt', input),
  cancelSceneGroupGeneration: (sceneGroupId) =>
    ipcRenderer.invoke('generation:cancelSceneGroupGeneration', sceneGroupId),
  copyGeneratedImage: (imageId) => ipcRenderer.invoke('generation:copyGeneratedImage', imageId),
  downloadGeneratedImage: (imageId) => ipcRenderer.invoke('generation:downloadGeneratedImage', imageId),
  deleteGeneratedImage: (imageId) => ipcRenderer.invoke('generation:deleteGeneratedImage', imageId),
  subscribeToUpdateStatus: (listener) => {
    const wrappedListener = (_event, payload) => listener(payload);
    ipcRenderer.on('app:updateStatus', wrappedListener);
    return () => {
      ipcRenderer.removeListener('app:updateStatus', wrappedListener);
    };
  },
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
  subscribeToDirectorSceneReady: (listener) => {
    const wrappedListener = (_event, payload) => listener(payload);
    ipcRenderer.on('generation:directorSceneReady', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:directorSceneReady', wrappedListener);
    };
  },
  subscribeToImageReady: (listener) => {
    const wrappedListener = (_event, payload) => listener(payload);
    ipcRenderer.on('generation:imageReady', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:imageReady', wrappedListener);
    };
  },
  subscribeToDirectorMessageStart: (listener) => {
    const wrappedListener = (_event, payload) => listener(payload);
    ipcRenderer.on('generation:directorMessageStart', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:directorMessageStart', wrappedListener);
    };
  },
  subscribeToDirectorMessageDelta: (listener) => {
    const wrappedListener = (_event, payload) => listener(payload);
    ipcRenderer.on('generation:directorMessageDelta', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:directorMessageDelta', wrappedListener);
    };
  },
  subscribeToDirectorMessageComplete: (listener) => {
    const wrappedListener = (_event, payload) => listener(payload);
    ipcRenderer.on('generation:directorMessageComplete', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:directorMessageComplete', wrappedListener);
    };
  },
  subscribeToDirectorMessageError: (listener) => {
    const wrappedListener = (_event, payload) => listener(payload);
    ipcRenderer.on('generation:directorMessageError', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:directorMessageError', wrappedListener);
    };
  },
});
