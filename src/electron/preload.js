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
    return;
  }

  window.location.reload();
});

ipcRenderer.addListener('OpenDevTools', (event, beacon) => {
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

(() => {
  const addButton = () => {
    const { location = {} } = window;
    const { origin = '', search = '', } = location;

    const matched = search.includes('?id=');

    if (!matched) {
      return;
    }

    const prefix = '&branch=feature-lxs-electron';
    const source = `${origin}/designer/app${search}${prefix}`;
    const href = source.replace('id=', 'appId=');

    const style = document.createElement('style');

    const button = document.createElement('div');
    const title = document.createElement('div');
    const description = document.createElement('div');

    const css = `
    .electron-button {
      padding: 5px 10px;
      position: fixed;
      top: 80px;
      right: 20px;
      text-align: center;
      background: white;
      border-radius: 5px;
      box-shadow: 0 0 5px rgba(0, 0, 0, .2);
      user-select: none;
      cursor: pointer;
      z-index: 999999;
    }

    .electron-button:hover {
      opacity: .75;
      transition: .2s;
    }

    .electron-button-title {
      font-size: 14px;
      font-weight: bold;
    }

    .electron-button-description {
      font-size: 12px;
      opacity: .7;
      font-style: italic;
    }
  `;

    const cssNode = document.createTextNode(css);

    style.type = 'text/css';
    style.appendChild(cssNode);

    title.innerText = '可视化开发 - NodeWorker';
    description.innerText = '仅限 3.13.1 版本应用';

    button.classList.add('electron-button');
    title.classList.add('electron-button-title');
    description.classList.add('electron-button-description');

    button.appendChild(title);
    button.appendChild(description);

    document.body.appendChild(style);
    document.body.appendChild(button);

    button.addEventListener('click', () => {
      window.location.href = href;
    });
  };

  const loop = () => {
    document.body?.innerText?.includes?.('应用中心')
      ? setTimeout(addButton, 1000)
      : setTimeout(loop, 1000);
  };

  loop();
})();
