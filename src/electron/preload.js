const electron = require('electron');
const {
  webFrame,
  ipcRenderer,
  contextBridge,
} = electron;

const store = new Map();
const recorder = new Map();

const createBeacon = (() => {
  let beacon = 0;
  return () => beacon++;
})();

const fromFunction = (arg) => {
  if (recorder.has(arg)) {
    return recorder.get(arg);
  }

  const type = typeof arg;
  const functional = type === 'function';

  if (functional) {
    const beacon = createBeacon();

    store.set(beacon, arg);
    recorder.set(beacon, arg);
    return { type, beacon };
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

  invoke('create')(...args);

  return {
    onerror: invoke('onerror'),
    onmessage: invoke('onmessage'),
    terminate: invoke('terminate'),
    postMessage: invoke('postMessage'),
    addEventListener: invoke('addEventListener'),
    removeEventListener: invoke('removeEventListener'),
  };
};

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
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  log: (...args) => console.log(...args),
  fetch: (...args) => ipcRenderer.invoke('fetch', ...args),
});
