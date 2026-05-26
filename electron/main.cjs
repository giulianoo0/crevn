const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { createGenerationStore } = require('./generation.cjs');

let mainWindow = null;
let generationStore = null;

app.setName('crenv');

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
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

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.whenReady().then(() => {
  generationStore = createGenerationStore(app.getPath('userData'));

  ipcMain.handle('generation:listGeneratedImages', async () => {
    return generationStore.listGeneratedImages();
  });

  ipcMain.handle('generation:generateImages', async (_event, payload) => {
    return generationStore.generateImages(payload);
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
