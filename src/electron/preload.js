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

const ipcInvoke = (channel, ...args) => {
  args = args.map(fromFunction);

  return ipcRenderer.invoke(channel, ...args);
};

const ipcInvokeWithChannel = (channel) => (...args) => ipcInvoke(channel, ...args);

const ipvWorkerInvoke = (workerBeacon) => (channel) => (...args) => {
  return ipcInvoke('NodeWorker', workerBeacon, channel, ...args);
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

  return async (...args) => {
    const beacons = Array.from(store.keys());
    const context = { beacons };

    // window?.gc?.();
    return ipcRenderer.invoke('beforeunload', context);
  };
})();

const fetchBufferAndType = ipcInvokeWithChannel('fetchBufferAndType');
const fetchAndCacheScript = ipcInvokeWithChannel('fetchAndCacheScript');

const createObjectURLByUrl = async (url = '') => {
  const fetched = await fetchBufferAndType(url) || {};
  const { buffer, type } = fetched;

  const options = { type };
  const blob = new Blob([buffer], options);

  return URL.createObjectURL(blob, options);
};

(() => {
  const { performance: { memory = {} } = {} } = window;
  const { usedJSHeapSize = 0 } = memory;

  const oneKB = 1024;
  const oneMB = oneKB * 1024;
  const oneGB = oneMB * 1024;
  const large = usedJSHeapSize > oneGB;

  // large && window?.gc?.();
})();

// TODO Electron redirect 存在 bug - https://github.com/electron/electron/issues/43715
// navigator?.serviceWorker?.register?.(
//   '/cacher?neutron&localization&file=/browser/worker/cacher.js',
// );

ipcRenderer.addListener('Refresh', (event) => {
  const webview = document.querySelector('webview.active');

  if (webview) {
    const name = 'refresh-webview';
    const custom = new CustomEvent(name);

    document.dispatchEvent(custom);
  } else {
    window.location.reload();
  }
});

ipcRenderer.addListener('HandleTab', (event, detail) => {
  const webview = document.querySelector('webview.active');

  if (!webview) {
    return;
  }

  const name = 'handle-tab';
  const options = { detail };
  const custom = new CustomEvent(name, options);

  document.dispatchEvent(custom);
});

ipcRenderer.addListener('ToggleDevTools', (event) => {
  const webview = document.querySelector('webview.active');

  const code = `
  (() => {
    const webview = document.querySelector('webview.active');

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
  fetchBufferAndType,
  createObjectURLByUrl,
  fetchAndCacheScript,
  invoke: ipcInvokeWithChannel,
  platform: () => process.platform,
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  log: (...args) => console.log(...args),
  fetch: ipcInvokeWithChannel('fetch'),
  freemem: ipcInvokeWithChannel('freemem'),
  totalmem: ipcInvokeWithChannel('totalmem'),
  execCommands: ipcInvokeWithChannel('execCommands'),
});

(() => {
  const handler = () => {
    const cacheKeywords = window.__cacheKeywords__ || ['mdd-ide'];
    const createElement = document.createElement.bind(document);
    const fetchAndCacheScript = window.electron?.fetchAndCacheScript;

    if (!createElement) {
      return;
    }

    document.createElement = (...args) => {
      const created = createElement(...args);

      if (!window.loadIdeEntry) {
        return created;
      }

      if (!fetchAndCacheScript) {
        return created;
      }

      const { tagName } = created;

      if (tagName !== 'SCRIPT') {
        return created;
      }

      const attribue = 'src';

      const getter = () => created._src;

      const setter = (value) => {
        const some = (item) => value?.includes?.(item);
        const included = cacheKeywords?.some?.(some);

        created._src = value;

        if (!included) {
          return created.setAttribute(attribue, value);
        }

        (async () => {
          const event = new Event('load');
          const url = new URL(value, window.location.href);
          const innerHTML = await fetchAndCacheScript(url.href);

          created.innerHTML = innerHTML;
          setTimeout(() => created.dispatchEvent(event));
        })();

        return value;
      };

      const options = { get: getter, set: setter };

      Object.defineProperty(created, attribue, options);

      return created;
    };
  };

  const code = handler.toString();
  const javasctipt = `(${code})()`;

  webFrame.executeJavaScript(javasctipt);
})();
