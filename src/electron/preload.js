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

const settings = (() => {
  try {
    const source = process.env?.settings;

    return source && JSON.parse(source);
  } catch (error) {
    console.error(error);
  }
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

const fetchBufferAndType = ipcInvokeWithChannel('fetchBufferAndType');
const fetchAndCacheScript = ipcInvokeWithChannel('fetchAndCacheScript');
const fetchPasswordFromSafe = ipcInvokeWithChannel('fetchPasswordFromSafe');

const createWorker = (() => {
  if (!settings.enableNodeWorker) {
    return;
  }

  return (...args) => {
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
})();

const beforeunload = (() => {
  const { location: { host } = {} } = window;

  const types = ['text', 'password'];
  const attribute = 'neutron-auto-fill';

  const toSelector = (item) => `input[type=${item}]:not([autocomplete=off])`;
  const selector = types.map(toSelector).join(',');

  const addStyle = () => {
    const element = document.createElement('style');

    element.textContent = `input[${attribute}] {
      background-color: rgb(232, 240, 254);
    }`;

    document.head.appendChild(element);
  };

  const elementToCurrent = (element = {}) => {
    const { type, value } = element;
    return { type, value };
  };

  const getInputs = () => {
    const elements = document.querySelectorAll(selector) || [];
    const array = Array.from(elements);

    return array.map(elementToCurrent);
  };

  const listener = (event) => {
    event?.target?.removeAttribute(attribute);
    event?.removeEventListener('input', listener);
  };

  const forEachType = (inputs = []) => (type) => {
    if (!type) {
      return;
    }

    const currentSelector = toSelector(type);
    const currentInputs = inputs.filter((item) => item?.type == type);
    const currentElements = document.querySelectorAll(currentSelector) || [];

    const forEach = (input, index) => {
      const element = currentElements[index];

      if (!element || element?.value) {
        return;
      }

      const event = new Event('input');

      element.value = input.value;
      element.dispatchEvent(event);
      element.setAttribute(attribute, '');
      element.addEventListener('input', listener);
    };

    currentInputs.forEach(forEach);
  };

  const setInputs = async () => {
    const passwordSelector = toSelector('password');
    const passwordElements = document.querySelectorAll(passwordSelector);

    if (!passwordElements?.length) {
      return;
    }

    const fetched = await fetchPasswordFromSafe(host) || {};
    const forEach = forEachType(fetched?.inputs || []);

    types.forEach(forEach);
  };

  window.addEventListener('load', () => {
    addStyle();
    setTimeout(setInputs, 2500);
  });

  webFrame.executeJavaScript(`
    window.addEventListener('beforeunload', () => {
      window.electron?.beforeunload?.();
    });
  `);

  return async (...args) => {
    const inputs = getInputs();
    const beacons = Array.from(store.keys());
    const context = { host, beacons, inputs };

    return ipcRenderer.invoke('beforeunload', context);
  };
})();

const createObjectURLByUrl = async (url = '') => {
  const fetched = await fetchBufferAndType(url) || {};
  const { buffer, type } = fetched;

  const options = { type };
  const blob = new Blob([buffer], options);

  return URL.createObjectURL(blob, options);
};

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

(() => {
  const invoke = ipcInvokeWithChannel('triggerFind');

  const listener = (event) => {
    const {
      which,
      ctrlKey,
      metaKey,
      defaultPrevented,
    } = event;

    if (defaultPrevented) {
      return;
    }

    const finding = which === 70;
    const pressed = ctrlKey || metaKey;
    const macthed = finding && pressed;

    macthed && invoke();
  };

  window.addEventListener('keydown', (...args) => {
    setTimeout(() => listener(...args));
  }, { capture: true });
})();

ipcRenderer.addListener('HandleFind', (event, detail) => {
  const name = 'handle-find';
  const options = { detail };
  const custom = new CustomEvent(name, options);

  document.dispatchEvent(custom);
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
  fetchAndCacheScript,
  fetchPasswordFromSafe,
  createObjectURLByUrl,
  invoke: ipcInvokeWithChannel,
  platform: () => process.platform,
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  log: (...args) => console.log(...args),
  fetch: ipcInvokeWithChannel('fetch'),
  freemem: ipcInvokeWithChannel('freemem'),
  totalmem: ipcInvokeWithChannel('totalmem'),
  settings: ipcInvokeWithChannel('settings'),
  execCommands: ipcInvokeWithChannel('execCommands'),
});
