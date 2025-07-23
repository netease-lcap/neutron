const {
  Menu,
  clipboard,
} = require('electron');

const {
  settings,
  sendToAllWindows,
} = require('./tools.js');

const separatorMenuItem = { type: 'separator' };

const createHrefMenu = (webContents, params = {}) => {
  const { linkURL } = params;

  if (!linkURL) {
    return [];
  }

  const openLabel = '在新标签页中打开链接';

  const openClick = async () => {
    const state = {  src: linkURL };
    const options = { type: 'add', state };

    sendToAllWindows('HandleTab', options);
  };

  const copyLabel = '复制链接地址';

  const copyClick = () => clipboard.writeText(linkURL);

  return [
    { label: openLabel, click: openClick },
    { label: copyLabel, click: copyClick },
  ];
};

const createTextMenu = (webContents, params = {}) => {
  const { selectionText } = params;

  if (!selectionText) {
    return [];
  }

  const sliced = selectionText.slice(0, 20);
  const matched = sliced === selectionText;
  const text = matched ? sliced : `${sliced}...`;
  const serachLabel = `搜索“${text}”`;

  const serachClick = async () => {
    const { searchEngine = '' } = await settings.get();

    const src = searchEngine.replace('%s', selectionText);
    const options = { type: 'add', state: { src } };

    sendToAllWindows('HandleTab', options);
  };

  return [
    { role: 'copy', label: '复制' },
    { label: serachLabel, click: serachClick },
  ];
};

const createImageMenu = (webContents, params = {}) => {
  const { srcURL } = params;

  if (!srcURL) {
    return [];
  }

  return [
    {
      label: '图片储存为...',
      click: () => webContents.downloadURL(srcURL),
    },
  ];
};

const createHistoryMenu = (webContents, params = {}) => {
  const {
    srcURL,
    linkURL,
    selectionText,
  } = params;

  if (selectionText || linkURL || srcURL) {
    return [];
  }

  const canGoBack = webContents?.navigationHistory?.canGoBack?.();
  const canGoForward = webContents?.navigationHistory?.canGoForward?.();

  const goBack = () => webContents?.navigationHistory?.goBack?.();
  const goForward = () => webContents?.navigationHistory?.goForward?.();

  const reloadClick = () => webContents?.reload?.();

  return [
    {
      label: '返回',
      click: goBack,
      enabled: canGoBack,
    },
    {
      label: '前进',
      click: goForward,
      enabled: canGoForward,
    },
    {
      label: '重新加载',
      click: reloadClick,
    },
  ];
};

const createToolMenu = (webContents, params) => {
  return [
    {
      label: '检查',
      click: () => webContents?.toggleDevTools?.(),
    },
  ];
};

const createWebMenu = (webContents, params) => {
  const list = [
    createHrefMenu(webContents, params),
    createTextMenu(webContents, params),
    createImageMenu(webContents, params),
    createHistoryMenu(webContents, params),
    createToolMenu(webContents, params),
  ];

  const filter = (array) => array?.length;
  const reduce = (result, array, index) => {
    const more = [separatorMenuItem, ...array];
    return result.length ? [...result, ...more] : array;
  };

  const menu = list.filter(filter).reduce(reduce, []);

  return Menu.buildFromTemplate(menu);
};

module.exports = {
  createWebMenu,
};
