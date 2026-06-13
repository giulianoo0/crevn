const { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, net, protocol } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs/promises');
const path = require('path');
const { pathToFileURL } = require('node:url');
const { createAutoUpdateManager } = require('./autoUpdate.cjs');
const { createAppLogger, installConsoleFileLogger } = require('./appLogger.cjs');
const { createGenerationStore, getAppDataPaths } = require('./generation.cjs');
const { applyProviderSettingsToEnv, createProviderSettingsStore } = require('./providerSettings.cjs');
const packageManifest = require('../package.json');

let mainWindow = null;
let generationStore = null;
let autoUpdateManager = null;
let providerSettingsStore = null;

// Resolves once the generation store finishes initializing. IPC handlers await
// this so the window can be created (and the renderer can start loading) in
// parallel with the database init instead of after it.
let resolveStoreReady;
const storeReady = new Promise((resolve) => {
  resolveStoreReady = resolve;
});
const ASSET_PROTOCOL = 'crenv-asset';
const appLogger = createAppLogger();

installConsoleFileLogger(appLogger);
console.info(`[crenv:app] logFile: ${appLogger.logFilePath}`);

process.on('uncaughtException', (error) => {
  console.error('[crenv:app] uncaughtException', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[crenv:app] unhandledRejection', reason);
});

protocol.registerSchemesAsPrivileged([
  {
    scheme: ASSET_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

app.setName('crenv');

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

function sanitizeExportFileName(value, fallback) {
  const sanitized = String(value ?? '')
    .trim()
    .replace(/[/\\]+/g, '-')
    .replace(/[^a-zA-Z0-9._ -]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^-+|-+$/g, '');
  return sanitized || fallback;
}

function withExtension(fileName, extension) {
  return fileName.toLowerCase().endsWith(extension) ? fileName : `${fileName}${extension}`;
}

async function showExportSaveDialog({ defaultName, extension, label }) {
  const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
    defaultPath: withExtension(defaultName, extension),
    filters: [
      {
        name: label,
        extensions: [extension.slice(1)],
      },
    ],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return withExtension(result.filePath, extension);
}

async function showImportOpenDialog({ extension, label }) {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    properties: ['openFile'],
    filters: [
      {
        name: label,
        extensions: [extension.slice(1)],
      },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

function getSourceAppInfo() {
  return {
    name: packageManifest.name ?? app.getName(),
    version: app.getVersion(),
  };
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();

  // `removeMenu()` strips the default reload accelerator, so wire up
  // Ctrl+R / Cmd+R (and F5) to reload the renderer explicitly.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') {
      return;
    }
    const key = input.key?.toLowerCase();
    const isReloadCombo = (input.control || input.meta) && key === 'r';
    const isFunctionReload = key === 'f5';
    if (isReloadCombo || isFunctionReload) {
      event.preventDefault();
      mainWindow?.webContents.reload();
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

function registerAssetProtocol() {
  const appPaths = getAppDataPaths(app.getPath('userData'));

  protocol.handle(ASSET_PROTOCOL, async (request) => {
    const url = new URL(request.url);
    const encodedPath = url.searchParams.get('path');

    if (!encodedPath) {
      return new Response('Missing asset path', { status: 400 });
    }

    const filePath = decodeURIComponent(encodedPath);
    if (!filePath.startsWith(appPaths.generatedImagesDir + path.sep)) {
      return new Response('Forbidden asset path', { status: 403 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

app.whenReady().then(async () => {
  console.info(`[crenv:app] ready userDataDir=${app.getPath('userData')}`);
  registerAssetProtocol();
  providerSettingsStore = createProviderSettingsStore(app.getPath('userData'));

  // Initialize the generation store in the background so the window can be
  // created (and the renderer can begin loading) in parallel with the database
  // init. Every IPC handler awaits `storeReady` before touching the store.
  const initStore = async () => {
    applyProviderSettingsToEnv(await providerSettingsStore.read());
    const store = await createGenerationStore(app.getPath('userData'), {
    onScenePlan: (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:scenePlan', payload);
      }
    },
    onSceneFrameReady: (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:sceneFrameReady', payload);
      }
    },
    onImageReady: (payload) => {
      console.info(
        `[crenv:renderer] generation:imageReady jobId=${payload.jobId} assetId=${payload.asset?.id ?? 'unknown'} clientRunId=${payload.clientRunId ?? 'none'}`
      );
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:imageReady', payload);
      }
    },
    onDirectorMessageStart: (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:directorMessageStart', payload);
      }
    },
    onDirectorMessageDelta: (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:directorMessageDelta', payload);
      }
    },
    onDirectorMessageComplete: (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:directorMessageComplete', payload);
      }
    },
    onDirectorMessageError: (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:directorMessageError', payload);
      }
    },
    onDirectorSceneReady: (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:directorSceneReady', payload);
      }
    },
    });
    generationStore = store;
    resolveStoreReady(store);
    console.info('[crenv:app] generation store ready');
  };
  initStore().catch((error) => {
    console.error('[crenv:app] failed to initialize generation store', error);
  });

  ipcMain.handle('generation:listGeneratedImages', async (_event, threadId) => {
    return (await storeReady).listGeneratedImages(threadId);
  });

  ipcMain.handle('generation:listProjectsWithThreads', async () => {
    return (await storeReady).listProjectsWithThreads();
  });

  ipcMain.handle('generation:listReferences', async () => {
    return (await storeReady).listReferences();
  });

  ipcMain.handle('generation:listReferenceFolders', async () => {
    return (await storeReady).listReferenceFolders();
  });

  ipcMain.handle('generation:listDirectorChats', async (_event, threadId) => {
    return (await storeReady).listDirectorChats(threadId);
  });

  ipcMain.handle('generation:createDirectorChat', async (_event, threadId) => {
    return (await storeReady).createDirectorChat(threadId);
  });

  ipcMain.handle('generation:renameDirectorChat', async (_event, chatId, title) => {
    return (await storeReady).renameDirectorChat(chatId, title);
  });

  ipcMain.handle('generation:deleteDirectorChat', async (_event, chatId) => {
    return (await storeReady).deleteDirectorChat(chatId);
  });

  ipcMain.handle('generation:listDirectorMessages', async (_event, chatId) => {
    return (await storeReady).listDirectorMessages(chatId);
  });

  ipcMain.handle('generation:sendDirectorMessage', async (_event, payload) => {
    return (await storeReady).sendDirectorMessage(payload);
  });

  ipcMain.handle('generation:regenerateDirectorMessage', async (_event, payload) => {
    return (await storeReady).regenerateDirectorMessage(payload);
  });

  ipcMain.handle('generation:approveDirectorAction', async (_event, payload) => {
    return (await storeReady).approveDirectorAction(payload);
  });

  ipcMain.handle('generation:declineDirectorAction', async (_event, payload) => {
    return (await storeReady).declineDirectorAction(payload);
  });

  ipcMain.handle('generation:cancelDirectorChat', async (_event, chatId) => {
    return (await storeReady).cancelDirectorChat(chatId);
  });

  ipcMain.handle('generation:createReference', async (_event, payload) => {
    return (await storeReady).createReference(payload);
  });

  ipcMain.handle('generation:createEnvironmentReference', async (_event, payload) => {
    return (await storeReady).createEnvironmentReference(payload);
  });

  ipcMain.handle('generation:createReferenceFolder', async (_event, payload) => {
    return (await storeReady).createReferenceFolder(payload);
  });

  ipcMain.handle('generation:createReferenceCollection', async (_event, payload) => {
    return (await storeReady).createReferenceCollection(payload);
  });

  ipcMain.handle('generation:updateReference', async (_event, payload) => {
    return (await storeReady).updateReference(payload);
  });

  ipcMain.handle('generation:updateEnvironmentReference', async (_event, payload) => {
    return (await storeReady).updateEnvironmentReference(payload);
  });

  ipcMain.handle('generation:updateReferenceCollection', async (_event, payload) => {
    return (await storeReady).updateReferenceCollection(payload);
  });

  ipcMain.handle('generation:deleteReference', async (_event, payload) => {
    return (await storeReady).deleteReference(payload);
  });

  ipcMain.handle('generation:describeReferenceCollection', async (_event, payload) => {
    return (await storeReady).describeReferenceCollection(payload);
  });

  ipcMain.handle('generation:ensureProjectThreadWorkspace', async () => {
    return (await storeReady).ensureProjectThreadWorkspace();
  });

  ipcMain.handle('generation:createProject', async (_event, projectName) => {
    return (await storeReady).createProject(projectName);
  });

  ipcMain.handle('generation:createThread', async (_event, projectId) => {
    return (await storeReady).createThread(projectId);
  });

  ipcMain.handle('generation:renameProject', async (_event, projectId, name) => {
    return (await storeReady).renameProject(projectId, name);
  });

  ipcMain.handle('generation:updateProjectSettings', async (_event, projectId, payload) => {
    return (await storeReady).updateProjectSettings(projectId, payload);
  });

  ipcMain.handle('generation:exportProject', async (_event, projectId) => {
    const projects = await (await storeReady).listProjectsWithThreads();
    const project = projects.find((candidate) => candidate.id === projectId);
    const filePath = await showExportSaveDialog({
      defaultName: sanitizeExportFileName(project?.name, 'project'),
      extension: '.crenv',
      label: 'Crenv Export',
    });
    if (!filePath) {
      return { status: 'canceled' };
    }
    await (await storeReady).exportProject(projectId, filePath, {
      sourceApp: getSourceAppInfo(),
    });
    return { status: 'exported', filePath };
  });

  ipcMain.handle('generation:exportThread', async (_event, threadId) => {
    const projects = await (await storeReady).listProjectsWithThreads();
    const thread = projects.flatMap((project) => project.threads).find((candidate) => candidate.id === threadId);
    const filePath = await showExportSaveDialog({
      defaultName: sanitizeExportFileName(thread?.name, 'thread'),
      extension: '.crenv',
      label: 'Crenv Export',
    });
    if (!filePath) {
      return { status: 'canceled' };
    }
    await (await storeReady).exportThread(threadId, filePath, {
      sourceApp: getSourceAppInfo(),
    });
    return { status: 'exported', filePath };
  });

  ipcMain.handle('generation:exportReference', async (_event, payload) => {
    const filePath = await showExportSaveDialog({
      defaultName: sanitizeExportFileName(payload?.title, 'reference'),
      extension: '.refc',
      label: 'Reference Export',
    });
    if (!filePath) {
      return { status: 'canceled' };
    }
    await (await storeReady).exportReference(payload, filePath, {
      sourceApp: getSourceAppInfo(),
    });
    return { status: 'exported', filePath };
  });

  ipcMain.handle('generation:importCrenv', async (_event, targetProjectId) => {
    const filePath = await showImportOpenDialog({
      extension: '.crenv',
      label: 'Crenv Export',
    });
    if (!filePath) {
      return { status: 'canceled' };
    }
    return (await storeReady).importCrenvArchive(filePath, { targetProjectId });
  });

  ipcMain.handle('generation:importReference', async () => {
    const filePath = await showImportOpenDialog({
      extension: '.refc',
      label: 'Reference Export',
    });
    if (!filePath) {
      return { status: 'canceled' };
    }
    return (await storeReady).importReferenceArchive(filePath);
  });

  ipcMain.handle('generation:renameThread', async (_event, threadId, name) => {
    return (await storeReady).renameThread(threadId, name);
  });

  ipcMain.handle('generation:deleteProject', async (_event, projectId) => {
    return (await storeReady).deleteProject(projectId);
  });

  ipcMain.handle('generation:deleteThread', async (_event, threadId) => {
    return (await storeReady).deleteThread(threadId);
  });

  ipcMain.handle('generation:generateImages', async (_event, payload) => {
    return (await storeReady).generateImages(payload);
  });

  ipcMain.handle('generation:listSceneGroups', async (_event, threadId) => {
    return (await storeReady).listSceneGroups(threadId);
  });

  ipcMain.handle('generation:createSceneGroup', async (_event, threadId, input) => {
    return (await storeReady).createSceneGroup(threadId, input);
  });

  ipcMain.handle('generation:updateSceneGroup', async (_event, sceneGroupId, input) => {
    return (await storeReady).updateSceneGroup(sceneGroupId, input);
  });

  ipcMain.handle('generation:deleteSceneGroup', async (_event, sceneGroupId) => {
    return (await storeReady).deleteSceneGroup(sceneGroupId);
  });

  ipcMain.handle('generation:createSceneFrame', async (_event, sceneGroupId, input) => {
    return (await storeReady).createSceneFrame(sceneGroupId, input);
  });

  ipcMain.handle('generation:updateSceneFrame', async (_event, sceneFrameId, input) => {
    return (await storeReady).updateSceneFrame(sceneFrameId, input);
  });

  ipcMain.handle('generation:deleteSceneFrame', async (_event, sceneFrameId) => {
    return (await storeReady).deleteSceneFrame(sceneFrameId);
  });

  ipcMain.handle('generation:saveSceneFrameReferences', async (_event, sceneFrameId, references) => {
    return (await storeReady).saveSceneFrameReferences(sceneFrameId, references);
  });

  ipcMain.handle('generation:pasteClipboardImageToSceneFrame', async (_event, sceneFrameId) => {
    const image = clipboard.readImage();
    if (image.isEmpty()) {
      return null;
    }

    const bytes = image.toPNG();
    if (bytes.length === 0) {
      return null;
    }

    return (await storeReady).pasteClipboardImageToSceneFrame(sceneFrameId, {
      mimeType: 'image/png',
      bytesBase64: bytes.toString('base64'),
    });
  });

  ipcMain.handle('generation:generateSceneGroup', async (_event, input) => {
    return (await storeReady).generateSceneGroup(input);
  });

  ipcMain.handle('generation:structureScenePrompt', async (_event, input) => {
    return (await storeReady).structureScenePrompt(input);
  });

  ipcMain.handle('generation:cancelSceneGroupGeneration', async (_event, sceneGroupId) => {
    return (await storeReady).cancelSceneGroupGeneration(sceneGroupId);
  });

  ipcMain.handle('generation:copyGeneratedImage', async (_event, imageId) => {
    const asset = await (await storeReady).getGeneratedImage(imageId);
    if (!asset) {
      throw new Error('Generated image not found.');
    }

    const image = nativeImage.createFromPath(asset.storedPath);
    if (image.isEmpty()) {
      throw new Error('Failed to load generated image.');
    }

    clipboard.writeImage(image);
  });

  ipcMain.handle('generation:downloadGeneratedImage', async (_event, imageId) => {
    const asset = await (await storeReady).getGeneratedImage(imageId);
    if (!asset) {
      throw new Error('Generated image not found.');
    }

    const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
      defaultPath: asset.fileName,
    });

    if (result.canceled || !result.filePath) {
      return false;
    }

    await fs.copyFile(asset.storedPath, result.filePath);
    return true;
  });

  ipcMain.handle('generation:deleteGeneratedImage', async (_event, imageId) => {
    await (await storeReady).deleteGeneratedImage(imageId);
  });

  autoUpdateManager = createAutoUpdateManager({
    app,
    autoUpdater,
    getWindow: () => mainWindow,
  });

  ipcMain.handle('app:getUpdateStatus', async () => {
    return autoUpdateManager.getStatus();
  });

  ipcMain.handle('app:getInfo', async () => {
    return getSourceAppInfo();
  });

  ipcMain.handle('app:getProviderSettings', async () => {
    return providerSettingsStore.read();
  });

  ipcMain.handle('app:updateProviderSettings', async (_event, payload) => {
    return providerSettingsStore.update(payload);
  });

  ipcMain.handle('app:checkForUpdates', async () => {
    return autoUpdateManager.checkNow();
  });

  ipcMain.handle('app:installUpdate', async () => {
    return autoUpdateManager.installNow();
  });

  createWindow();
  console.info('[crenv:app] main window created');
  autoUpdateManager.start();

  app.on('activate', () => {
    console.info('[crenv:app] activate');
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  console.info('[crenv:app] window-all-closed');
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  console.info('[crenv:app] before-quit');
  autoUpdateManager?.dispose();
  generationStore?.close();
});
