const fs = require('fs');
const path = require('path');
const { app } = require('electron');

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

const keys = [
  'LC_ALL',
  'LC_CTYPE',
  'LC_MESSAGES',
  'LANG',
  'LANGUAGE',
];

const getLanguage = () => {
  const reduce = (result, key) => result || process?.env?.[key] || '';
  const source = keys.reduce(reduce, '');

  const reg = /[^a-zA-Z0-9]/g;
  const list = source.split('.').filter(Boolean);
  const [first] = list;

  return first?.replace?.(reg, '-');
};

const writeFile = async (...args) => {
  const [filePath] = args;

  const directoryPath = path.dirname(filePath);
  const directoryExisted = fs.existsSync(directoryPath);

  if (!directoryExisted) {
    await fs.promises.mkdir(directoryPath, { recursive: true });
  }

  return fs.promises.writeFile(...args);
};

const cacher = (() => {
  const lifetime = 1000 * 60 * 60 * 24 * 7;
  const directory = 'neutron/_cache';
  const options = { encoding: 'utf8' };

  const cacher = new Map();
  const dataPath = app.getPath('appData');
  const directoryPath = path.resolve(dataPath, directory);

  const getter = (key) => cacher.get(key);

  const read = async (key) => {
    const absolutePath = path.resolve(directoryPath, key);
    const existed = fs.existsSync(absolutePath);

    if (!existed) {
      return;
    }

    const source = await fs.promises.readFile(absolutePath, options);

    cacher.set(key, source);
    return source;
  };

  const setter = (key, value) => {
    const absolutePath = path.resolve(directoryPath, key);

    writeFile(absolutePath, value, options);
    cacher.set(key, value);
    return value;
  };

  const clear = () => {
    const now = Date.now();
    const files = fs.readdirSync(directoryPath) || [];

    files.forEach((file) => {
      const absolutePath = path.resolve(directoryPath, file);
      const { mtime = 0 } = fs.statSync(absolutePath) || {};

      const time = new Date(mtime);
      const life = now - time;
      const dead = life > lifetime;

      dead && fs.rm(absolutePath);
    });
  };

  return {
    read,
    clear,
    get: getter,
    set: setter,
  };
})();

module.exports = {
  isFunction,
  createURL,
  sendToFrame,
  sendToAllWindows,
  execCommand,
  execCommands,
  getLanguage,
  writeFile,
  cacher,
};
