const fs = require('fs');
const path = require('path');

const { spawn, execSync } = require('child_process');
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

const spawnSync = (...args) => new Promise((resolve, reject) => {
  const result = spawn(...args);
  const { stdout, stderr } = result;

  let output = '';

  stdout.setEncoding('utf8');
  stderr.setEncoding('utf8');

  stdout.on('data', (data) => { output += data });
  stderr.on('data', (data) => reject(data));
  result.on('close', () => resolve(output));
});

const electronEnv = {
  ELECTRON_RUN_AS_NODE: 1,
};

const polyfillEnvironmentWithVariables = async (context = {}) => {
  const { execPath, env = {} } = process;
  const {
    envPath,
    envNodePath,
    binFolder,
    libFolder,
    npmFolder,
    spliter,
  } = context;

  Object.assign(env, electronEnv);

  if (!envPath?.includes?.(binFolder)) {
    const strings = [binFolder, envPath];
    const source = strings.filter(Boolean);

    env.PATH = source.join(spliter);
  }

  if (!envNodePath?.includes?.(libFolder)) {
    const strings = [libFolder, envNodePath];
    const source = strings.filter(Boolean);

    env.NODE_PATH = source.join(spliter);
  }

  if (!fs.existsSync(binFolder)) {
    fs.mkdirSync(binFolder);
  }

  if (!fs.existsSync(`${binFolder}/node`)) {
    fs.symlinkSync(execPath, `${binFolder}/node`);
  }

  if (!fs.existsSync(`${binFolder}/npm`)) {
    const args = [npmFolder, 'install', 'npm', '-g'];

    await spawnSync(process.execPath, args, {
      env: electronEnv,
      encoding: 'utf8',
    });
  }
};

const polyfillEnvironment = async () => {
  const {
    platform,
    execPath,
    env = {},
  } = process;

  if (!execPath) {
    return;
  }

  switch (platform) {
    // MacOS
    case 'darwin': {
      const spliter = ':';
      const envPath = env?.PATH;
      const envNodePath = env?.NODE_PATH;
      const binFolder = path.resolve(execPath, '../../bin');
      const libFolder = path.resolve(execPath, '../../lib/node_modules');
      const npmFolder = path.resolve(__dirname, '../../node_modules/npm');

      await polyfillEnvironmentWithVariables({
        envPath,
        envNodePath,
        binFolder,
        libFolder,
        npmFolder,
        spliter,
      });

      break;
    }
    // Windows
    case 'win32': {
      const spliter = ';';
      const envPath = env?.PATH;
      const envNodePath = env?.NODE_PATH;
      const binFolder = path.resolve(execPath, '../');
      const libFolder = path.resolve(execPath, '../node_modules');
      const npmFolder = path.resolve(__dirname, '../../node_modules/npm');

      await polyfillEnvironmentWithVariables({
        envPath,
        envNodePath,
        binFolder,
        libFolder,
        npmFolder,
        spliter,
      });

      break;
    }
  }
};

const mergedExecOptions = (options) => {
  const { env: basic = {} } = process;

  const encoding = 'utf8';
  const env = { ...basic, ...electronEnv };

  return { encoding, env, ...options };
};

const execCommand = async (command = '', options = {}) => {
  await polyfillEnvironment();

  const merged = mergedExecOptions(options);

  return execSync(command, merged);
};

const execCommands = (commands = [], ...args) => {
  const arraied = Array.isArray(commands);
  const array = arraied ? commands : [commands];

  const reduce = async (promise, command) => {
    await promise;
    return execCommand(command, ...args);
  };

  return array.reduce(reduce, undefined);
};

module.exports = {
  isFunction,
  createURL,
  sendToFrame,
  sendToAllWindows,
  execCommand,
  execCommands,
};
