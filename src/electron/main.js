const path = require('path');
const {
  app,
  ipcMain,
  BrowserWindow,
  globalShortcut,
} = require('electron');

const Worker = require('./node-worker.js');

const basePath = path.resolve(__dirname, './');
const preload = path.resolve(basePath, 'preload.js');

const store = new Map();

const isFunction = (arg) => {
  const type = arg?.type;
  const beacon = arg?.beacon;

  return beacon !== undefined && type === 'function';
};

const createURL = (source) => {
  if (typeof source === 'string') {
    return source;
  }

  const code = Buffer.from(source).toString('base64');

  return `data:application/javascript;base64,${code}`;
};

const sendToFrame = (...args) => (window) => {
  const { webContents: { mainFrame } = {} } = window;
  const { framesInSubtree = [] } = mainFrame;

  const forEach = (item) => item?.send?.(...args);

  framesInSubtree.forEach(forEach);
};

const createWindow = () => {
  const webPreferences = {
    webviewTag: true,
    devTools: true,
    preload,
  };

  const window = new BrowserWindow({
    autoHideMenuBar: true,
    webPreferences
  });

  window.maximize();

  // window.loadURL('https://csforkf.lcap.codewave-test.163yun.com');

  if (process.env.NODE_ENV === 'development') {
    window.loadURL('http://localhost:1405');
  } else {
    window.loadFile('dist/index.html');
  }

  // 大应用
  // window.loadURL('https://csforkf.lcap.codewave-test.163yun.com/designer/app?appId=73073003-a5ca-4170-ab41-1d9a3646b466&branch=feature-lxs-electron');
  // 小应用
  // window.loadURL('https://csforkf.lcap.codewave-test.163yun.com/designer/app?appId=4a0d8758-0d80-4a75-803a-a8329693c6f6&branch=feature-lxs-electron');
};

(() => {
  app.disableHardwareAcceleration();

  app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
      return;
    }

    app.quit();
  });

  app.on('web-contents-created', (event, webContents) => {
    webContents.on('will-attach-webview', (event, webPreferences) => {
      webPreferences.preload = webPreferences.preload || preload;
    });

    webContents.setWindowOpenHandler((event) => {
      // window.webContents.executeJavaScript(
      //   `window.location.href = '${event.url}'`,
      // );
      webContents.loadURL(event.url);
      return { action: 'deny' };
    });
  });
})();

(async () => {
  await app.whenReady();

  globalShortcut.register('CommandOrControl+R', () => {
    const windows = BrowserWindow.getAllWindows();

    windows.forEach(
      sendToFrame('Refresh'),
    );
  });

  globalShortcut.register('Command+Option+I', () => {
    const windows = BrowserWindow.getAllWindows();

    windows.forEach(
      sendToFrame('OpenDevTools'),
    );
  });

  globalShortcut.register('Command+Option+I', () => {
    const windows = BrowserWindow.getAllWindows();

    windows.forEach(
      sendToFrame('OpenDevTools'),
    );
  });

  globalShortcut.register('Control+Shift+I', () => {
    const windows = BrowserWindow.getAllWindows();

    windows.forEach(
      sendToFrame('OpenDevTools'),
    );
  });

  globalShortcut.register('CommandOrControl+I', () => {
    const windows = BrowserWindow.getAllWindows();

    windows.forEach(
      (item) => item?.webContents?.toggleDevTools?.(),
    );
  });

  ipcMain.handle('fetch', (event, ...args) => fetch(...args));

  ipcMain.handle('NodeWorker', (event, beacon, action, ...args) => {
    const { sender } = event;

    const toFunction = (arg) => {
      const beacon = arg?.beacon;
      const functional = isFunction(arg);

      if (!functional) {
        return arg;
      }

      // TODO 移除无用 function，防止内存泄漏
      return (...params) => sender.send('StoreExecute', beacon, ...params);
    };

    args = args.map(toFunction);

    if (action === 'create') {
      const [source, ...rest] = args;

      const url = createURL(source);
      const worker = new Worker(url, ...rest);

      store.set(beacon, worker);
    } else {
      const worker = store.get(beacon);

      worker?.[action]?.(...args);
    }
  });

  await createWindow();

  app.on('activate', () => {
    const windows = BrowserWindow.getAllWindows();

    if (windows.length > 0) {
      return;
    }

    createWindow();
  });
})();