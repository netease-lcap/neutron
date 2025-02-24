const electron = require('electron');
const {
  webFrame,
  ipcRenderer,
  contextBridge,
} = electron;

const store = new Map();
const recorder = new Map();

const createBeacon = (() => {
  const prefix = Math.random();
  let suffix = 0;

  return () => `${prefix}/${suffix++}`;
})();

const fromFunction = (arg) => {
  if (recorder.has(arg)) {
    return recorder.get(arg);
  }

  const type = typeof arg;
  const functional = type === 'function';

  if (functional) {
    const beacon = createBeacon();
    const result = { type, beacon };

    store.set(beacon, arg);
    recorder.set(arg, result);
    return result;
  }

  return arg;
};

const ipcInvoke = (action, ...args) => {
  args = args.map(fromFunction);

  return ipcRenderer.invoke(action, ...args);
};

const ipvWorkerInvoke = (workerBeacon) => (action) => (...args) => {
  return ipcInvoke('NodeWorker', workerBeacon, action, ...args);
};

const createWorker = (...args) => {
  const beacon = createBeacon();
  const invoke = ipvWorkerInvoke(beacon);

  store.set(beacon, true);
  invoke('create')(...args);

  return {
    terminate: invoke('terminate'),
    postMessage: invoke('postMessage'),
    addEventListener: invoke('addEventListener'),
    removeEventListener: invoke('removeEventListener'),
  };
};

const beforeunload = (() => {
  webFrame.executeJavaScript(`
    window.addEventListener('beforeunload', () => {
      window.electron?.beforeunload?.();
    }); 
  `);

  return (...args) => {
    const beacons = Array.from(store.keys());
    const context = { beacons };

    window.gc();
    ipcRenderer.invoke('beforeunload', context);
  };
})();

navigator?.serviceWorker?.register?.(
  '/cacher?neutron&localization&file=/browser/worker/cacher.js',
);

ipcRenderer.addListener('Refresh', (event, beacon) => {
  const webview = document.querySelector('webview');

  if (webview) {
    const name = 'refresh-webview';
    const event = new CustomEvent(name);

    document.dispatchEvent(event);
  } else {
    window.location.reload();
  }
});

ipcRenderer.addListener('ToggleDevTools', (event, beacon) => {
  const webview = document.querySelector('webview');

  const code = `
  (() => {
    const webview = document.querySelector('webview');

    if (!webview) {
      return;
    }

    webview?.isDevToolsOpened?.()
      ? webview?.closeDevTools?.()
      : webview?.openDevTools?.();
  })();
`;

  webview && webFrame.executeJavaScript(code);
});

ipcRenderer.addListener('StoreDelete', (event, beacon) => {
  const record = store.get(beacon);

  store.delete(beacon);
  recorder.delete(record);
});

ipcRenderer.addListener('StoreExecute', (event, beacon, ...params) => {
  const got = store.get(beacon);
  const functional = typeof got === 'function';

  functional && got(...params);
});

contextBridge.exposeInMainWorld('electron', {
  createWorker,
  beforeunload,
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  log: (...args) => console.log(...args),
  fetch: (...args) => ipcRenderer.invoke('fetch', ...args),
});
