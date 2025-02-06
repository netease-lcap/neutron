const path = require('path');
const electron = require('electron');

const {
  app,
  ipcMain,
  BrowserWindow,
} = electron;

const basePath = path.resolve(__dirname, './');
const preload = path.resolve(basePath, 'preload.js');

const createWindow = () => {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload,
      devTools: true,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
    },
  });

  // window.loadFile('index.html');
  window.loadURL('https://csforkf.lcap.codewave-test.163yun.com/designer/app?appId=73073003-a5ca-4170-ab41-1d9a3646b466&branch=feature-lxs-electron');
};

(() => {
  app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
      return;
    }

    app.quit();
  });
})();

(async () => {
  await app.whenReady();

  ipcMain.handle('ping', () => 'pong');

  await createWindow();

  app.on('activate', () => {
    const windows = BrowserWindow.getAllWindows();

    if (windows.length > 0) {
      return;
    }

    createWindow();
  });
})();