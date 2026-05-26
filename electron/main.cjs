const { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, net, protocol } = require('electron');
const fs = require('node:fs/promises');
const path = require('path');
const { pathToFileURL } = require('node:url');
const { createGenerationStore, getAppDataPaths } = require('./generation.cjs');

let mainWindow = null;
let generationStore = null;
const ASSET_PROTOCOL = 'crenv-asset';

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
  registerAssetProtocol();
  generationStore = await createGenerationStore(app.getPath('userData'), {
    onScenePlan: (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:scenePlan', payload);
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

  ipcMain.handle('generation:createReference', async (_event, payload) => {
    return generationStore.createReference(payload);
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

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  generationStore?.close();
});
