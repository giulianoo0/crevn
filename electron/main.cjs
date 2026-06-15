const mainStartupStartedAt = Date.now();
const { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, net, protocol, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs/promises');
const path = require('path');
const { pathToFileURL } = require('node:url');
const { createAutoUpdateManager } = require('./autoUpdate.cjs');
const { createAppLogger, installConsoleFileLogger } = require('./appLogger.cjs');
const {
  getActiveCodexImageAccount,
  refreshAllCodexImageAccountLimits: refreshCodexImageAccountLimitsInSettings,
  refreshCodexImageAccountToken,
  removeCodexImageAccount,
  runCodexImageOAuthFlow,
  selectCodexImageAccount,
  shouldRefreshCodexImageAccountToken,
  toPublicProviderSettings,
  upsertCodexImageAccount,
} = require('./codexImageAuth.cjs');
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
let rejectStoreReady;
const storeReady = new Promise((resolve, reject) => {
  resolveStoreReady = resolve;
  rejectStoreReady = reject;
});
storeReady.catch(() => undefined);
const ASSET_PROTOCOL = 'crenv-asset';
const appLogger = createAppLogger();

installConsoleFileLogger(appLogger);
console.info(`[crenv:app] logFile: ${appLogger.logFilePath}`);

function getStartupDurationMs(startedAt = mainStartupStartedAt) {
  return Math.max(0, Date.now() - startedAt);
}

function safeStartupFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) =>
      ['string', 'number', 'boolean'].includes(typeof value) || value === null
    )
  );
}

function logStartup(label, startedAt = mainStartupStartedAt, fields = {}) {
  console.info(
    `[crenv:startup] ${label} ${JSON.stringify({
      durationMs: getStartupDurationMs(startedAt),
      elapsedMs: getStartupDurationMs(mainStartupStartedAt),
      ...safeStartupFields(fields),
    })}`
  );
}

function summarizeStartupResult(result) {
  if (Array.isArray(result)) {
    return { resultType: 'array', count: result.length };
  }
  if (result && typeof result === 'object') {
    if (result.project && result.thread) {
      return {
        resultType: 'workspace',
        projectId: result.project.id ?? null,
        threadId: result.thread.id ?? null,
      };
    }
    if (typeof result.state === 'string') {
      return {
        resultType: 'updateStatus',
        state: result.state,
        version: result.version ?? null,
      };
    }
    if (typeof result.name === 'string' && typeof result.version === 'string') {
      return {
        resultType: 'appInfo',
        name: result.name,
        version: result.version,
      };
    }
    return { resultType: 'object' };
  }
  return { resultType: typeof result };
}

function handleStartupIpc(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    const startedAt = Date.now();
    logStartup(`ipc ${channel} started`, startedAt, {
      argCount: args.length,
      firstArg: typeof args[0] === 'string' ? args[0] : null,
    });
    try {
      const result = await handler(event, ...args);
      logStartup(`ipc ${channel} completed`, startedAt, summarizeStartupResult(result));
      return result;
    } catch (error) {
      logStartup(`ipc ${channel} failed`, startedAt, {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}

logStartup('main module loaded', mainStartupStartedAt, {
  pid: process.pid,
  nodeEnv: process.env.NODE_ENV ?? null,
});

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

async function readPublicProviderSettings() {
  return toPublicProviderSettings(await providerSettingsStore.read());
}

async function updateTextProviderSettings(payload) {
  const current = await providerSettingsStore.read();
  const updated = await providerSettingsStore.update({
    ...current,
    text: payload?.text ?? current.text,
  });
  return toPublicProviderSettings(updated);
}

function toImageGenerationCodexAuth(account) {
  if (!account?.tokens?.accessToken || !account?.accountId) {
    return null;
  }
  return {
    accessToken: account.tokens.accessToken,
    accountId: account.accountId,
    isFedrampAccount: Boolean(account.isFedrampAccount),
  };
}

async function getActiveCodexImageAuthForGeneration() {
  let settings = await providerSettingsStore.read();
  let account = getActiveCodexImageAccount(settings);
  if (!account) {
    return null;
  }

  if (shouldRefreshCodexImageAccountToken(account)) {
    const refreshed = await refreshCodexImageAccountToken(account);
    settings = await providerSettingsStore.update(upsertCodexImageAccount(settings, refreshed));
    account = getActiveCodexImageAccount(settings);
  }

  return toImageGenerationCodexAuth(account);
}

async function refreshCodexImageAccountLimitsForStore() {
  const settings = await providerSettingsStore.read();
  const refreshed = await refreshCodexImageAccountLimitsInSettings(settings);
  return providerSettingsStore.update(refreshed);
}

async function startCodexImageOAuthAndPersistAccount() {
  const account = await runCodexImageOAuthFlow({
    openExternal: (url) => shell.openExternal(url),
  });
  const withAccount = upsertCodexImageAccount(await providerSettingsStore.read(), account);
  const refreshed = await refreshCodexImageAccountLimitsInSettings(withAccount);
  return toPublicProviderSettings(await providerSettingsStore.update(refreshed));
}

async function selectCodexImageAccountInStore(accountId) {
  const selected = selectCodexImageAccount(await providerSettingsStore.read(), accountId);
  return toPublicProviderSettings(await providerSettingsStore.update(selected));
}

async function removeCodexImageAccountFromStore(accountId) {
  const removed = removeCodexImageAccount(await providerSettingsStore.read(), accountId);
  return toPublicProviderSettings(await providerSettingsStore.update(removed));
}

const createWindow = () => {
  const createWindowStartedAt = Date.now();
  logStartup('browser window create started', createWindowStartedAt);
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
  logStartup('browser window constructed', createWindowStartedAt);

  mainWindow.on('closed', () => {
    logStartup('browser window closed', createWindowStartedAt);
    mainWindow = null;
  });

  mainWindow.on('unresponsive', () => {
    logStartup('browser window unresponsive', createWindowStartedAt);
  });

  mainWindow.on('responsive', () => {
    logStartup('browser window responsive', createWindowStartedAt);
  });

  let loadStartedAt = Date.now();
  mainWindow.webContents.on('did-start-loading', () => {
    loadStartedAt = Date.now();
    logStartup('webContents did-start-loading', loadStartedAt);
  });
  mainWindow.webContents.on('dom-ready', () => {
    logStartup('webContents dom-ready', loadStartedAt);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    logStartup('webContents did-finish-load', loadStartedAt);
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logStartup('webContents did-fail-load', loadStartedAt, {
      errorCode,
      errorDescription,
      url: validatedURL,
    });
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logStartup('webContents render-process-gone', loadStartedAt, {
      reason: details.reason,
      exitCode: details.exitCode,
    });
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
    loadStartedAt = Date.now();
    logStartup('webContents load requested', loadStartedAt, { target: 'vite-dev-server' });
    mainWindow.loadURL('http://127.0.0.1:5173').catch((error) => {
      logStartup('webContents load rejected', loadStartedAt, {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });
  } else {
    loadStartedAt = Date.now();
    logStartup('webContents load requested', loadStartedAt, { target: 'dist-index' });
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch((error) => {
      logStartup('webContents load rejected', loadStartedAt, {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });
  }
  logStartup('browser window create completed', createWindowStartedAt);
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
  logStartup('app.whenReady resolved', mainStartupStartedAt, {
    userDataDir: app.getPath('userData'),
  });
  console.info(`[crenv:app] ready userDataDir=${app.getPath('userData')}`);
  const assetProtocolStartedAt = Date.now();
  registerAssetProtocol();
  logStartup('asset protocol registered', assetProtocolStartedAt);
  const providerStoreStartedAt = Date.now();
  providerSettingsStore = createProviderSettingsStore(app.getPath('userData'));
  logStartup('provider settings store created', providerStoreStartedAt);

  ipcMain.on('app:startupLog', (_event, payload) => {
    const fields =
      payload && typeof payload === 'object' && payload.fields && typeof payload.fields === 'object'
        ? payload.fields
        : {};
    const label = payload && typeof payload.label === 'string' ? payload.label : 'renderer startup log';
    console.info(`[crenv:startup] ${label} ${JSON.stringify(safeStartupFields(fields))}`);
  });

  // Initialize the generation store in the background so the window can be
  // created (and the renderer can begin loading) in parallel with the database
  // init. Every IPC handler awaits `storeReady` before touching the store.
  const initStore = async () => {
    const initStoreStartedAt = Date.now();
    logStartup('generation store init started', initStoreStartedAt);
    const providerReadStartedAt = Date.now();
    applyProviderSettingsToEnv(await providerSettingsStore.read());
    logStartup('provider settings read and applied', providerReadStartedAt);
    const createStoreStartedAt = Date.now();
    const store = await createGenerationStore(app.getPath('userData'), {
      getActiveCodexImageAuth: getActiveCodexImageAuthForGeneration,
      refreshAllCodexImageAccountLimits: refreshCodexImageAccountLimitsForStore,
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
    logStartup('createGenerationStore resolved', createStoreStartedAt);
    generationStore = store;
    resolveStoreReady(store);
    logStartup('generation store init completed', initStoreStartedAt);
    console.info('[crenv:app] generation store ready');
  };
  initStore().catch((error) => {
    console.error('[crenv:app] failed to initialize generation store', error);
    rejectStoreReady(error);
  });

  handleStartupIpc('generation:listGeneratedImages', async (_event, threadId) => {
    return (await storeReady).listGeneratedImages(threadId);
  });

  handleStartupIpc('generation:listProjectsWithThreads', async () => {
    return (await storeReady).listProjectsWithThreads();
  });

  handleStartupIpc('generation:listReferences', async () => {
    return (await storeReady).listReferences();
  });

  handleStartupIpc('generation:listReferenceFolders', async () => {
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

  handleStartupIpc('generation:ensureProjectThreadWorkspace', async () => {
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

  ipcMain.handle('generation:setGeneratedImageFavorite', async (_event, imageId, favorite) => {
    return (await storeReady).setGeneratedImageFavorite(imageId, Boolean(favorite));
  });

  autoUpdateManager = createAutoUpdateManager({
    app,
    autoUpdater,
    getWindow: () => mainWindow,
  });

  handleStartupIpc('app:getUpdateStatus', async () => {
    return autoUpdateManager.getStatus();
  });

  handleStartupIpc('app:getInfo', async () => {
    return getSourceAppInfo();
  });

  handleStartupIpc('app:getProviderSettings', async () => {
    return readPublicProviderSettings();
  });

  ipcMain.handle('app:updateProviderSettings', async (_event, payload) => {
    return updateTextProviderSettings(payload);
  });

  handleStartupIpc('app:startCodexImageOAuth', async () => {
    return startCodexImageOAuthAndPersistAccount();
  });

  handleStartupIpc('app:selectCodexImageAccount', async (_event, accountId) => {
    return selectCodexImageAccountInStore(accountId);
  });

  handleStartupIpc('app:removeCodexImageAccount', async (_event, accountId) => {
    return removeCodexImageAccountFromStore(accountId);
  });

  handleStartupIpc('app:refreshCodexImageAccountLimits', async () => {
    return toPublicProviderSettings(await refreshCodexImageAccountLimitsForStore());
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
