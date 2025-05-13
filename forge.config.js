const fs = require('fs');
const path = require('path');

const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const basePath = path.resolve(__dirname, './');

const electronPath = (() => {
  const built = `./builds/${process.platform}`;

  return path.resolve(basePath, built);
})();

const enabled = fs.existsSync(electronPath);

const osxNotarize = {
  teamId: 'CF44QJESLS',
  appleId: process.env.APPLE_ID,
  appleIdPassword: process.env.APPLE_ID_PASSWORD,
};

const forgeConfig = {
  packagerConfig: {
    asar: true,
    prune: true,
    icon: 'src/public/icon',
    name: 'CodeWave 智能开发平台',
    osxSign: {},
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'CodeWave',
        productName: 'CodeWave 智能开发平台',
        noMsi: true,
        iconUrl: path.resolve(basePath, 'src/public/icon.ico'),
        // windows 存在 bug，开启 utf-8 beta 自定义图标
        setupIcon: path.resolve(basePath, 'src/public/icon.ico'),
        loadingGif: path.resolve(basePath, 'src/public/loading.png'),
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-local-electron',
      config: { electronPath, enabled },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: true,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        prerelease: true,
        repository: { owner: 'netease-lcap', name: 'neutron' },
      },
    },
  ],
};

(() => {
  if (process.platform !== 'darwin') {
    return;
  }

  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
    console.warn(
      'Should be notarizing, but environment variables APPLE_ID or APPLE_ID_PASSWORD are missing!',
    );
    return;
  }

  forgeConfig.packagerConfig.osxNotarize = forgeConfig;
})();

module.exports = forgeConfig;
