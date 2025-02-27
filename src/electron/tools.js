const { execSync } = require('child_process');
const { BrowserWindow } = require('electron');

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
  const { webContents: { mainFrame = {} } = {} } = window;
  const { framesInSubtree = [] } = mainFrame;

  const forEach = (item) => item?.send?.(...args);

  framesInSubtree.forEach(forEach);
};

const sendToAllWindows = (...args) => {
  const windows = BrowserWindow.getAllWindows();

  windows.forEach(sendToFrame(...args));
};

const execCommand = (...args) => execSync(...args);

const execCommands = (commands = [], ...args) => {
  const arraied = Array.isArray(commands);
  const merged = arraied ? commands : [commands];

  const reduce = async (promise, command) => {
    await promise;
    return execCommand(command, ...args);
  };

  return merged.reduce(reduce, undefined);
};

module.exports = {
  isFunction,
  createURL,
  sendToFrame,
  sendToAllWindows,
  execCommand,
  execCommands,
};
