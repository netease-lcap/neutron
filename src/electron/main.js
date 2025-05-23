const path = require('path');
const { pathToFileURL } = require('url');
const {
  app,
  net,
  ipcMain,
  session,
  protocol,
  crashReporter,
  BrowserWindow,
  globalShortcut,
} = require('electron');

const Sentry = require('@sentry/electron/main');
const squirrel = require('electron-squirrel-startup');
const { updateElectronApp } = require('update-electron-app');

const {
  isFunction,
  createURL,
  sendToFrame,
  sendToAllWindows,
  execCommands,
} = require('./tools.js');

const Worker = require('./node-worker.js');

const basePath = path.resolve(__dirname, './');
const preload = path.resolve(basePath, 'preload.js');
const developing = process.env.NODE_ENV === 'development';

const store = new Map();
const registry = new FinalizationRegistry((beacon) => {
  store.delete(beacon);
  sendToAllWindows('StoreDelete', beacon);
});

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

const createWindow = (event = {}) => {
  const { referrer, url: src = '' } = event;

  const webPreferences = {
    webviewTag: true,
    devTools: true,
    preload,
  };

  const window = new BrowserWindow({
    autoHideMenuBar: true,
    webPreferences
  });

  const encoded = src && encodeURIComponent(src);
  const search = encoded ? `?src=${encoded}` : '';

  window.maximize();

  if (developing) {
    window.loadURL(`http://localhost:1405${search}`, { referrer });
  } else {
    window.loadFile('dist/index.html', { search });
  }

  return window;
};

const forPolyfill = () => {
  if (developing) {
    return;
  }

  updateElectronApp();

  Sentry.init({
    dsn: 'https://8ff3df805699b018d8879f6f23edfebe@o4505198733361152.sentry.codewave.163.com/4509309441540096',
  });

  crashReporter.start({
    companyName: 'NetEase (Hangzhou) Network Co',
    productName: 'Neutron',
    ignoreSystemCrashHandler: true,
    submitURL: 'https://o4505198733361152.sentry.codewave.163.com/api/4509309441540096/minidump/?sentry_key=8ff3df805699b018d8879f6f23edfebe',
  });
};

const forRegister = () => {
  const memoryLimitMb = 16 * 1024;
  const jsFlag = `--expose_gc --max-old-space-size=${memoryLimitMb}`;

  app.commandLine.appendSwitch('js-flags', jsFlag);
  app.commandLine.appendSwitch('force_high_performance_gpu');

  developing && app.disableHardwareAcceleration();

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
      createWindow(event);
      return { action: 'deny' };
    });
  });
};

const forRegisterWhenReady = async () => {
  await app.whenReady();

  // TODO Electron redirect 存在 bug - https://github.com/electron/electron/issues/43715
  // protocol.handle('https', (request = {}) => {
  //   const { url = '' } = request;
  //   const { pathname, searchParams } = new URL(url);
  // 
  //   const a = searchParams.has('neutron');
  //   const b = searchParams.has('localization');
  // 
  //   if (!a || !b) {
  //     return session.defaultSession.fetch(request, {
  //       bypassCustomProtocolHandlers: true,
  //       redirect: 'manual',
  //     });
  //   }
  // 
  //   const source = searchParams.get('file') || pathname;
  //   const filePath = path.resolve(basePath, `../${source}`);
  //   const file = pathToFileURL(filePath);
  //   const string = file.toString();
  // 
  //   return net.fetch(string);
  // });

  app.on('browser-window-focus', (event, window) => {
    windowShortcuts.forEach((item = {}) => {
      const { accelerator, callback } = item;

      const listener = () => callback(window);
      const closed = () => globalShortcut.unregister(accelerator);

      window.on('close', closed);
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
  
  ipcMain.handle('execCommands', (event, ...args) => execCommands(...args));

  ipcMain.handle('beforeunload', (event, context = {}) => {
    const { beacons = [] } = context;

    beacons.forEach((beacon) => {
      const got = store.get(beacon);

      got?.terminate?.();
      store.delete(beacon);
    });
  });

  ipcMain.handle('NodeWorker', (event, beacon, action, ...args) => {
    const { sender } = event;

    const toFunction = (arg) => {
      const beacon = arg?.beacon;
      const functional = isFunction(arg);

      const got = store.get(beacon);
      const actual = got?.deref?.();

      if (actual) {
        return actual;
      }

      if (!functional) {
        return arg;
      }

      const callback = (...params) => sender.send('StoreExecute', beacon, ...params);
      const ref = new WeakRef(callback);

      registry.register(callback, beacon);
      store.set(beacon, ref);
      return callback;
    };

    args = args.map(toFunction);

    if (action === 'create') {
      const [source, ...rest] = args;

      const url = createURL(source);
      const worker = new Worker(url, ...rest);

      store.set(beacon, worker);
    } else {
      const worker = store.get(beacon);
      const removed = action === 'terminate';

      worker?.[action]?.(...args);
      removed && store.delete(beacon);
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
};

(() => {
  if (squirrel) {
    app.quit();
  } else {
    forPolyfill();

    forRegister();
    forRegisterWhenReady();
  };
})();
