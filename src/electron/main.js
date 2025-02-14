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

  if (process.env.NODE_ENV === 'development') {
    window.loadURL('http://localhost:1405');
  } else {
    window.loadFile('dist/index.html');
  }
};

const windowShortcuts = [
  {
    accelerator: 'CommandOrControl+R',
    callback: sendToFrame('Refresh'),
  },
  {
    accelerator: 'Command+Option+I',
    callback: sendToFrame('ToggleDevTools'),
  },
  {
    accelerator: 'Control+Shift+I',
    callback: sendToFrame('ToggleDevTools'),
  },
  {
    accelerator: 'CommandOrControl+I',
    callback: (window) => window?.webContents?.toggleDevTools?.(),
  },
];

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
      webContents.loadURL(event.url);
      return { action: 'deny' };
    });
  });
})();

(async () => {
  await app.whenReady();

  app.on('browser-window-focus', (event, window) => {
    windowShortcuts.forEach((item = {}) => {
      const { accelerator, callback } = item;

      const listener = () => callback(window);

      globalShortcut.register(accelerator, listener);
    });
  });

  app.on('browser-window-blur', (event, window) => {
    windowShortcuts.forEach((item = {}) => {
      const { accelerator } = item;

      globalShortcut.unregister(accelerator);
    });
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