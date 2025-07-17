const os = require('os');
const fs = require('fs');
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

const squirrel = require('electron-squirrel-startup');
const { updateElectronApp, makeUserNotifier } = require('update-electron-app');

const {
  isFunction,
  createURL,
  sendToFrame,
  sendToAllWindows,
  execCommands,
  getLanguage,
  writeFile,
  cacher,
  safe,
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
  {
    accelerator: 'CommandOrControl+W',
    callback: () => sendToAllWindows('HandleTab', { type: 'close' }),
  },
  {
    accelerator: 'CommandOrControl+N',
    callback: () => sendToAllWindows('HandleTab', { type: 'add' }),
  },
  {
    accelerator: 'CommandOrControl+T',
    callback: () => sendToAllWindows('HandleTab', { type: 'add' }),
  },
  {
    accelerator: 'Command+Shift+T',
    callback: () => sendToAllWindows('HandleTab', { type: 'recover' }),
  },
  {
    accelerator: 'Control+Shift+T',
    callback: () => sendToAllWindows('HandleTab', { type: 'recover' }),
  },
];

const createWindow = (event = {}, options = {}) => {
  const { referrer, url: src = '' } = event;

  const titleBarOverlay = {
    color: 'rgba(0,0,0,0)',
    symbolColor: 'white',
    height: 41,
  };

  const trafficLightPosition = {
    x: 19,
    y: 12,
  };

  const webPreferences = {
    webviewTag: true,
    devTools: true,
    preload,
  };

  const window = new BrowserWindow({
    ...options,
    webPreferences,
    titleBarOverlay,
    trafficLightPosition,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
  });

  const encoded = src && encodeURIComponent(src);
  const search = encoded ? `?src=${encoded}` : '';

  const listener = () => window.removeAllListeners();

  window.hide();

  window.maximize();
  window.addListener('close', listener);

  window.show();

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

  const onNotifyUser = makeUserNotifier({
    title: '软件更新',
    detail: '最新版本软件已下载，请重启后完成应用升级。',
    restartButtonText: '重启应用',
    laterButtonText: '稍后提醒',
  });

  updateElectronApp({
    onNotifyUser,
    updateInterval: '24 hour',
  });

  crashReporter.start({
    companyName: 'NetEase (Hangzhou) Network Co',
    productName: 'Neutron',
    uploadToServer: true,
    ignoreSystemCrashHandler: true,
    submitURL: 'https://o4505198733361152.sentry.codewave.163.com/api/4509309441540096/minidump/?sentry_key=8ff3df805699b018d8879f6f23edfebe',
  });
};

const forRegister = () => {
  const memoryLimitMb = 16 * 1024;
  const jsFlag = `--expose_gc --max-old-space-size=${memoryLimitMb}`;
  const language = getLanguage() || 'zh-CN';

  app.commandLine.appendSwitch('js-flags', jsFlag);
  // 可能导致崩溃
  // app.commandLine.appendSwitch('force_high_performance_gpu');
  app.commandLine.appendSwitch('ignore-certificate-errors', true);

  language && app.commandLine.appendSwitch('lang', language);
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

    webContents.setWindowOpenHandler((event = {}) => {
      const creater = (options) => {
        const { url: src, referrer = {} } = event;
        const { url: httpreferrer } = referrer;

        const state = { src, httpreferrer }
        const detail = { type: 'add', state };

        sendToAllWindows('HandleTab', detail);
        options?.webContents?.destroy?.();

        return options?.webContents;
      };

      return { action: 'allow', createWindow: creater };
    });
  });
};

const forRegisterWhenReady = async () => {
  await app.whenReady();

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

  ipcMain.handle('freemem', (event, ...args) => os.freemem(...args));

  ipcMain.handle('totalmem', (event, ...args) => os.totalmem(...args));

  ipcMain.handle('fetchBufferAndType', async (event, ...args) => {
    const attribute = 'content-type';

    const fetched = await fetch(...args);
    const type = fetched?.headers?.get?.(attribute);

    const blob = await fetched.blob();
    const buffer = await blob.arrayBuffer();

    return { type, buffer };
  });

  ipcMain.handle('fetchAndCacheScript', async (event, ...args) => {
    const [link = ''] = args;

    const reg = /[^\.\w]/g;
    const file = link.replace(reg, '_');
    const cache = cacher.get(file);

    if (cache) {
      return cache;
    }

    const read = await cacher.read(file);

    if (read) {
      return read;
    }

    const fetched = await fetch(...args);
    const content = await fetched.text();

    cacher.set(file, content);
    return content;
  });

  ipcMain.handle('fetchPasswordFromSafe', (event, host) => safe.get(host));
  
  ipcMain.handle('execCommands', (event, ...args) => execCommands(...args));

  ipcMain.handle('beforeunload', (event = {}, context = {}) => {
    const { sender: { ipc } = {} } = event;
    const {
      host,
      inputs = [],
      beacons = [],
    } = context;

    (async () => {
      if (!host) {
        return;
      }

      const isPassword = (item) => item?.value && item?.type === 'password';
      const index = inputs.findIndex(isPassword);

      if (index <= 0) {
        return;
      }

      const previousInput = inputs[index - 1] || {};
      const { value } = previousInput;

      if (!value) {
        return;
      }

      const object = await safe.get(host) || {};
      const { recorder: source = {} } = object;

      const recorder = { ...source, [value]: inputs };
      const merged = { ...object, recorder, inputs };

      safe.set(host, merged);
    })();

    (() => {
      ipc?.removeAllListeners?.();

      beacons.forEach((beacon) => {
        const got = store.get(beacon);

        got?.terminate?.();
        store.delete(beacon);
      });
    })();
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

  app.on('before-quit', () => {
    cacher.clear();
  });

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
