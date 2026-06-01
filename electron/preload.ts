import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  listGeneratedImages: (threadId: string) => ipcRenderer.invoke('generation:listGeneratedImages', threadId),
  listProjectsWithThreads: () => ipcRenderer.invoke('generation:listProjectsWithThreads'),
  listReferences: () => ipcRenderer.invoke('generation:listReferences'),
  listDirectorChats: (threadId: unknown) => ipcRenderer.invoke('generation:listDirectorChats', threadId),
  createDirectorChat: (threadId: unknown) => ipcRenderer.invoke('generation:createDirectorChat', threadId),
  renameDirectorChat: (chatId: unknown, title: unknown) =>
    ipcRenderer.invoke('generation:renameDirectorChat', chatId, title),
  deleteDirectorChat: (chatId: unknown) => ipcRenderer.invoke('generation:deleteDirectorChat', chatId),
  listDirectorMessages: (chatId: unknown) => ipcRenderer.invoke('generation:listDirectorMessages', chatId),
  sendDirectorMessage: (payload: unknown) => ipcRenderer.invoke('generation:sendDirectorMessage', payload),
  cancelDirectorChat: (chatId: unknown) => ipcRenderer.invoke('generation:cancelDirectorChat', chatId),
  createReference: (payload: unknown) => ipcRenderer.invoke('generation:createReference', payload),
  createEnvironmentReference: (payload: unknown) => ipcRenderer.invoke('generation:createEnvironmentReference', payload),
  createReferenceCollection: (payload: unknown) => ipcRenderer.invoke('generation:createReferenceCollection', payload),
  updateReference: (payload: unknown) => ipcRenderer.invoke('generation:updateReference', payload),
  updateEnvironmentReference: (payload: unknown) => ipcRenderer.invoke('generation:updateEnvironmentReference', payload),
  updateReferenceCollection: (payload: unknown) => ipcRenderer.invoke('generation:updateReferenceCollection', payload),
  deleteReference: (payload: unknown) => ipcRenderer.invoke('generation:deleteReference', payload),
  describeReferenceCollection: (payload: unknown) => ipcRenderer.invoke('generation:describeReferenceCollection', payload),
  ensureProjectThreadWorkspace: () => ipcRenderer.invoke('generation:ensureProjectThreadWorkspace'),
  createProject: (projectName: string) => ipcRenderer.invoke('generation:createProject', projectName),
  createThread: (projectId: string) => ipcRenderer.invoke('generation:createThread', projectId),
  renameProject: (projectId: string, name: string) => ipcRenderer.invoke('generation:renameProject', projectId, name),
  updateProjectSettings: (projectId: string, payload: unknown) =>
    ipcRenderer.invoke('generation:updateProjectSettings', projectId, payload),
  renameThread: (threadId: string, name: string) => ipcRenderer.invoke('generation:renameThread', threadId, name),
  deleteProject: (projectId: string) => ipcRenderer.invoke('generation:deleteProject', projectId),
  deleteThread: (threadId: string) => ipcRenderer.invoke('generation:deleteThread', threadId),
  generateImages: (payload: unknown) => ipcRenderer.invoke('generation:generateImages', payload),
  listSceneGroups: (threadId: string) => ipcRenderer.invoke('generation:listSceneGroups', threadId),
  createSceneGroup: (threadId: string, input: unknown) =>
    ipcRenderer.invoke('generation:createSceneGroup', threadId, input),
  updateSceneGroup: (sceneGroupId: string, input: unknown) =>
    ipcRenderer.invoke('generation:updateSceneGroup', sceneGroupId, input),
  createSceneFrame: (sceneGroupId: string, input: unknown) =>
    ipcRenderer.invoke('generation:createSceneFrame', sceneGroupId, input),
  updateSceneFrame: (sceneFrameId: string, input: unknown) =>
    ipcRenderer.invoke('generation:updateSceneFrame', sceneFrameId, input),
  saveSceneFrameReferences: (sceneFrameId: string, references: unknown) =>
    ipcRenderer.invoke('generation:saveSceneFrameReferences', sceneFrameId, references),
  generateSceneGroup: (input: unknown) => ipcRenderer.invoke('generation:generateSceneGroup', input),
  structureScenePrompt: (input: unknown) => ipcRenderer.invoke('generation:structureScenePrompt', input),
  cancelSceneGroupGeneration: (sceneGroupId: string) =>
    ipcRenderer.invoke('generation:cancelSceneGroupGeneration', sceneGroupId),
  copyGeneratedImage: (imageId: string) => ipcRenderer.invoke('generation:copyGeneratedImage', imageId),
  downloadGeneratedImage: (imageId: string) => ipcRenderer.invoke('generation:downloadGeneratedImage', imageId),
  deleteGeneratedImage: (imageId: string) => ipcRenderer.invoke('generation:deleteGeneratedImage', imageId),
  subscribeToScenePlan: (listener: (payload: unknown) => void) => {
    const wrappedListener = (_event: unknown, payload: unknown) => listener(payload);
    ipcRenderer.on('generation:scenePlan', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:scenePlan', wrappedListener);
    };
  },
  subscribeToSceneFrameReady: (listener: (payload: unknown) => void) => {
    const wrappedListener = (_event: unknown, payload: unknown) => listener(payload);
    ipcRenderer.on('generation:sceneFrameReady', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:sceneFrameReady', wrappedListener);
    };
  },
  subscribeToDirectorMessageStart: (listener: (payload: unknown) => void) => {
    const wrappedListener = (_event: unknown, payload: unknown) => listener(payload);
    ipcRenderer.on('generation:directorMessageStart', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:directorMessageStart', wrappedListener);
    };
  },
  subscribeToDirectorMessageDelta: (listener: (payload: unknown) => void) => {
    const wrappedListener = (_event: unknown, payload: unknown) => listener(payload);
    ipcRenderer.on('generation:directorMessageDelta', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:directorMessageDelta', wrappedListener);
    };
  },
  subscribeToDirectorMessageComplete: (listener: (payload: unknown) => void) => {
    const wrappedListener = (_event: unknown, payload: unknown) => listener(payload);
    ipcRenderer.on('generation:directorMessageComplete', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:directorMessageComplete', wrappedListener);
    };
  },
  subscribeToDirectorMessageError: (listener: (payload: unknown) => void) => {
    const wrappedListener = (_event: unknown, payload: unknown) => listener(payload);
    ipcRenderer.on('generation:directorMessageError', wrappedListener);
    return () => {
      ipcRenderer.removeListener('generation:directorMessageError', wrappedListener);
    };
  },
});
