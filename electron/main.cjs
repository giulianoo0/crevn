const { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, net, protocol } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs/promises');
const path = require('path');
const { pathToFileURL } = require('node:url');
const { createAutoUpdateManager } = require('./autoUpdate.cjs');
const { createAppLogger, installConsoleFileLogger } = require('./appLogger.cjs');
const { createGenerationStore, getAppDataPaths } = require('./generation.cjs');
const packageManifest = require('../package.json');

let mainWindow = null;
let generationStore = null;
let autoUpdateManager = null;
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

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
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
  generationStore = await createGenerationStore(app.getPath('userData'), {
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

  ipcMain.handle('generation:listGeneratedImages', async (_event, threadId) => {
    return generationStore.listGeneratedImages(threadId);
  });

  ipcMain.handle('generation:listProjectsWithThreads', async () => {
    return generationStore.listProjectsWithThreads();
  });

  ipcMain.handle('generation:listReferences', async () => {
    return generationStore.listReferences();
  });

  ipcMain.handle('generation:listDirectorChats', async (_event, threadId) => {
    return generationStore.listDirectorChats(threadId);
  });

  ipcMain.handle('generation:createDirectorChat', async (_event, threadId) => {
    return generationStore.createDirectorChat(threadId);
  });

  ipcMain.handle('generation:renameDirectorChat', async (_event, chatId, title) => {
    return generationStore.renameDirectorChat(chatId, title);
  });

  ipcMain.handle('generation:deleteDirectorChat', async (_event, chatId) => {
    return generationStore.deleteDirectorChat(chatId);
  });

  ipcMain.handle('generation:listDirectorMessages', async (_event, chatId) => {
    return generationStore.listDirectorMessages(chatId);
  });

  ipcMain.handle('generation:sendDirectorMessage', async (_event, payload) => {
    return generationStore.sendDirectorMessage(payload);
  });

  ipcMain.handle('generation:approveDirectorAction', async (_event, payload) => {
    return generationStore.approveDirectorAction(payload);
  });

  ipcMain.handle('generation:declineDirectorAction', async (_event, payload) => {
    return generationStore.declineDirectorAction(payload);
  });

  ipcMain.handle('generation:cancelDirectorChat', async (_event, chatId) => {
    return generationStore.cancelDirectorChat(chatId);
  });

  ipcMain.handle('generation:createReference', async (_event, payload) => {
    return generationStore.createReference(payload);
  });

  ipcMain.handle('generation:createEnvironmentReference', async (_event, payload) => {
    return generationStore.createEnvironmentReference(payload);
  });

  ipcMain.handle('generation:createReferenceCollection', async (_event, payload) => {
    return generationStore.createReferenceCollection(payload);
  });

  ipcMain.handle('generation:updateReference', async (_event, payload) => {
    return generationStore.updateReference(payload);
  });

  ipcMain.handle('generation:updateEnvironmentReference', async (_event, payload) => {
    return generationStore.updateEnvironmentReference(payload);
  });

  ipcMain.handle('generation:updateReferenceCollection', async (_event, payload) => {
    return generationStore.updateReferenceCollection(payload);
  });

  ipcMain.handle('generation:deleteReference', async (_event, payload) => {
    return generationStore.deleteReference(payload);
  });

  ipcMain.handle('generation:describeReferenceCollection', async (_event, payload) => {
    return generationStore.describeReferenceCollection(payload);
  });

  ipcMain.handle('generation:ensureProjectThreadWorkspace', async () => {
    return generationStore.ensureProjectThreadWorkspace();
  });

  ipcMain.handle('generation:createProject', async (_event, projectName) => {
    return generationStore.createProject(projectName);
  });

  ipcMain.handle('generation:createThread', async (_event, projectId) => {
    return generationStore.createThread(projectId);
  });

  ipcMain.handle('generation:renameProject', async (_event, projectId, name) => {
    return generationStore.renameProject(projectId, name);
  });

  ipcMain.handle('generation:updateProjectSettings', async (_event, projectId, payload) => {
    return generationStore.updateProjectSettings(projectId, payload);
  });

  ipcMain.handle('generation:exportProject', async (_event, projectId) => {
    const projects = await generationStore.listProjectsWithThreads();
    const project = projects.find((candidate) => candidate.id === projectId);
    const filePath = await showExportSaveDialog({
      defaultName: sanitizeExportFileName(project?.name, 'project'),
      extension: '.crenv',
      label: 'Crenv Export',
    });
    if (!filePath) {
      return { status: 'canceled' };
    }
    await generationStore.exportProject(projectId, filePath, {
      sourceApp: getSourceAppInfo(),
    });
    return { status: 'exported', filePath };
  });

  ipcMain.handle('generation:exportThread', async (_event, threadId) => {
    const projects = await generationStore.listProjectsWithThreads();
    const thread = projects.flatMap((project) => project.threads).find((candidate) => candidate.id === threadId);
    const filePath = await showExportSaveDialog({
      defaultName: sanitizeExportFileName(thread?.name, 'thread'),
      extension: '.crenv',
      label: 'Crenv Export',
    });
    if (!filePath) {
      return { status: 'canceled' };
    }
    await generationStore.exportThread(threadId, filePath, {
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
    await generationStore.exportReference(payload, filePath, {
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
    return generationStore.importCrenvArchive(filePath, { targetProjectId });
  });

  ipcMain.handle('generation:importReference', async () => {
    const filePath = await showImportOpenDialog({
      extension: '.refc',
      label: 'Reference Export',
    });
    if (!filePath) {
      return { status: 'canceled' };
    }
    return generationStore.importReferenceArchive(filePath);
  });

  ipcMain.handle('generation:renameThread', async (_event, threadId, name) => {
    return generationStore.renameThread(threadId, name);
  });

  ipcMain.handle('generation:deleteProject', async (_event, projectId) => {
    return generationStore.deleteProject(projectId);
  });

  ipcMain.handle('generation:deleteThread', async (_event, threadId) => {
    return generationStore.deleteThread(threadId);
  });

  ipcMain.handle('generation:generateImages', async (_event, payload) => {
    return generationStore.generateImages(payload);
  });

  ipcMain.handle('generation:listSceneGroups', async (_event, threadId) => {
    return generationStore.listSceneGroups(threadId);
  });

  ipcMain.handle('generation:createSceneGroup', async (_event, threadId, input) => {
    return generationStore.createSceneGroup(threadId, input);
  });

  ipcMain.handle('generation:updateSceneGroup', async (_event, sceneGroupId, input) => {
    return generationStore.updateSceneGroup(sceneGroupId, input);
  });

  ipcMain.handle('generation:deleteSceneGroup', async (_event, sceneGroupId) => {
    return generationStore.deleteSceneGroup(sceneGroupId);
  });

  ipcMain.handle('generation:createSceneFrame', async (_event, sceneGroupId, input) => {
    return generationStore.createSceneFrame(sceneGroupId, input);
  });

  ipcMain.handle('generation:updateSceneFrame', async (_event, sceneFrameId, input) => {
    return generationStore.updateSceneFrame(sceneFrameId, input);
  });

  ipcMain.handle('generation:deleteSceneFrame', async (_event, sceneFrameId) => {
    return generationStore.deleteSceneFrame(sceneFrameId);
  });

  ipcMain.handle('generation:saveSceneFrameReferences', async (_event, sceneFrameId, references) => {
    return generationStore.saveSceneFrameReferences(sceneFrameId, references);
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

    return generationStore.pasteClipboardImageToSceneFrame(sceneFrameId, {
      mimeType: 'image/png',
      bytesBase64: bytes.toString('base64'),
    });
  });

  ipcMain.handle('generation:generateSceneGroup', async (_event, input) => {
    return generationStore.generateSceneGroup(input);
  });

  ipcMain.handle('generation:structureScenePrompt', async (_event, input) => {
    return generationStore.structureScenePrompt(input);
  });

  ipcMain.handle('generation:cancelSceneGroupGeneration', async (_event, sceneGroupId) => {
    return generationStore.cancelSceneGroupGeneration(sceneGroupId);
  });

  ipcMain.handle('generation:copyGeneratedImage', async (_event, imageId) => {
    const asset = await generationStore.getGeneratedImage(imageId);
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
    const asset = await generationStore.getGeneratedImage(imageId);
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
    await generationStore.deleteGeneratedImage(imageId);
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
