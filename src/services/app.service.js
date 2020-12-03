import AppConfig from '../config/app.config';

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const { app } = require('electron');

const log = require('electron-log');
const storageService = require('./storage.service');

function getLatestTerms() {
  log.info('Checking for latest ToS');
  return new Promise((resolve, reject) => {
    const axiosConfig = {
      headers: {
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-app-uuid': storageService.getAppData('UUID'),
      },
    };
    axios.get(`${AppConfig.API_URL}app/latest/tos`, axiosConfig)
      .then((response) => {
        if (response.status === 200) {
          const tos = response.data;
          const currentTos = storageService.getAppData('tos');
          if (tos.version > currentTos.version) {
            currentTos.version = tos.version;
            currentTos.accepted = false;
            currentTos.text = tos.text;
            storageService.setAppData('tos', currentTos);
            log.info('New ToS found');
            return resolve(true);
          }
          log.info('No new ToS found');
          return resolve(false);
        }
        return resolve(false);
      })
      .catch((err) => {
        log.error('Error checking for latest ToS');
        log.error(err.message);
        return reject(new Error('Error checking for latest ToS'));
      });
  });
}

// Download the latest Privacy Policy from the API
function getLatestPrivacy() {
  log.info('Checking for latest Privacy Policy');
  return new Promise((resolve, reject) => {
    const axiosConfig = {
      headers: {
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-app-uuid': storageService.getAppData('UUID'),
      },
    };
    axios.get(`${AppConfig.API_URL}app/latest/privacy`, axiosConfig)
      .then((response) => {
        if (response.status === 200) {
          const privacy = response.data;
          const currentPrivacy = storageService.getAppData('privacy');
          if (privacy.version > currentPrivacy.version) {
            currentPrivacy.version = privacy.version;
            currentPrivacy.accepted = false;
            currentPrivacy.text = privacy.text;
            storageService.setAppData('privacy', currentPrivacy);
            log.info('New Privacy Policy found');
            return resolve(true);
          }
          log.info('No new Privacy Policy found');
          return resolve(false);
        }
        return resolve(false);
      })
      .catch((err) => {
        log.error('Error checking for latest Privacy Policy');
        log.error(err.message);
        return reject(new Error('Error checking for latest Privacy Policy'));
      });
  });
}

function setAppConfig() {
  const version = storageService.getAppData('version');

  if (version < '0.3.0') {
    const gameD = storageService.getGameData('1');
    gameD.gameVersions.wow_retail.settingsBackup = '';
    gameD.gameVersions.wow_retail.addonBackup = '';
    gameD.gameVersions.wow_classic.settingsBackup = '';
    gameD.gameVersions.wow_classic.addonBackup = '';
    gameD.gameVersions.wow_retail_ptr.settingsBackup = '';
    gameD.gameVersions.wow_retail_ptr.addonBackup = '';
    gameD.gameVersions.wow_classic_ptr.settingsBackup = '';
    gameD.gameVersions.wow_classic_ptr.addonBackup = '';
    storageService.setGameData('1', gameD);
  }
  if (version < '0.3.2') {
    const gameS = storageService.getGameSettings('1');
    gameS.wow_retail_beta = {
      name: 'World of Warcraft Beta',
      nickName: 'Beta',
      shortName: 'wow-retail-beta',
      installed: false,
      installPath: 'C:\\Program Files (x86)\\World of Warcraft\\_beta_\\',
      installedAddons: [],
      unknownAddonDirs: [],
    };
    storageService.setGameSettings('1', gameS);
    const gameD = storageService.getGameData('1');
    gameD.gameVersions.wow_retail_beta = {
      name: 'World of Warcraft Beta',
      nickName: 'Beta',
      shortName: 'wow-retail-beta',
      addonVersion: 'wow_retail',
      flavorString: 'wow_beta',
      defaultWinInstallPath: 'C:\\Program Files (x86)\\World of Warcraft\\_beta_\\',
      defaultMacInstallPath: '/Applications/World of Warcraft/_beta_/',
      executable: 'WowB.exe',
      macExecutable: 'World of Warcraft Beta.app',
      addonDir: 'Interface\\Addons\\',
      macAddonDir: 'Interface/Addons/',
      settingsBackup: '',
      addonBackup: '',
    };
    storageService.setGameData('1', gameD);
  }
  if (version < '0.4.0') {
    const wowData = storageService.getGameData('1');
    if (!('macFlavorString' in wowData.gameVersions.wow_retail)) {
      wowData.gameVersions.wow_retail.macFlavorString = '/_retail_';
      wowData.gameVersions.wow_retail.macAddonDir = 'Interface/Addons/';
      wowData.gameVersions.wow_classic.macFlavorString = '/_classic_';
      wowData.gameVersions.wow_classic.macAddonDir = 'Interface/Addons/';
      wowData.gameVersions.wow_retail_ptr.macFlavorString = '/_ptr_';
      wowData.gameVersions.wow_retail_ptr.macAddonDir = 'Interface/Addons/';
      wowData.gameVersions.wow_classic_ptr.macFlavorString = '/_classic_ptr_';
      wowData.gameVersions.wow_classic_ptr.macAddonDir = 'Interface/Addons/';
      wowData.gameVersions.wow_retail_beta.macFlavorString = '/_beta_';
      wowData.gameVersions.wow_retail_beta.macAddonDir = 'Interface/Addons/';
      storageService.setGameData('1', wowData);
    }
  }
  if (version < '0.5.0') {
    const gameS = storageService.getGameSettings('1');
    Object.entries(gameS).forEach((gameVersion) => {
      const fixedAddons = [];
      const { installedAddons } = gameS[gameVersion];
      installedAddons.forEach((addon) => {
        const newAddon = addon;
        newAddon.trackBranch = addon.trackBranch || 1;
        newAddon.autoUpdate = addon.autoUpdate || false;
        newAddon.ignoreUpdate = addon.ignoreUpdate || false;
        newAddon.unknownUpdate = addon.unknownUpdate || false;
        newAddon.brokenInstallation = addon.brokenInstallation || false;
        fixedAddons.push(newAddon);
      });
      gameS[gameVersion].installedAddons = fixedAddons;
      storageService.setGameSettings('1', gameS);
    });
  }
  if (version < '0.6.0') {
    const gameS = storageService.getGameSettings('1');
    if (!('wow_retail_beta' in gameS)) {
      gameS.wow_retail_beta = {
        name: 'World of Warcraft Beta',
        nickName: 'Beta',
        shortName: 'wow-retail-beta',
        installed: false,
        installPath: 'C:\\Program Files (x86)\\World of Warcraft\\_beta_\\',
        installedAddons: [],
        unknownAddonDirs: [],
      };
    }
    storageService.setGameSettings('1', gameS);
    const wowData = storageService.getGameData('1');
    if (!('wow_retaul_beta' in wowData.gameVersions)) {
      wowData.gameVersions.wow_retail_beta = {
        name: 'World of Warcraft Beta',
        nickName: 'Beta',
        shortName: 'wow-retail-beta',
        addonVersion: 'wow_retail',
        flavorString: 'wow_beta',
        defaultWinInstallPath: 'C:\\Program Files (x86)\\World of Warcraft\\_beta_\\',
        defaultMacInstallPath: '/Applications/World of Warcraft/_beta_/',
        executable: 'WowB.exe',
        macExecutable: 'World of Warcraft Beta.app',
        addonDir: 'Interface\\Addons\\',
        macAddonDir: 'Interface/Addons/',
        settingsBackup: '',
        addonBackup: '',
      };
    } else if (!('macAddonDir' in wowData.gameVersions.wow_retail_beta)) {
      wowData.gameVersions.wow_retail_beta.macAddonDir = 'Interface/Addons/';
    }
    storageService.setGameData('1', wowData);
    const userConf = storageService.getAppData('userConfigurable');
    if (!('defaultWowVersion' in userConf)) {
      userConf.defaultWowVersion = 'wow_retail';
    }
    storageService.setAppData('userConfigurable', userConf);
  }

  if (version < '1.0.0') {
    storageService.setAppData('sidebarMinimized', false);
  }

  if (version < '1.1.0') {
    const gameS = storageService.getGameSettings('1');
    Object.entries(gameS).forEach((gameVersion) => {
      gameS[gameVersion].sync = false;
      gameS[gameVersion].defaults = {
        trackBranch: 1,
        autoUpdate: false,
      };
    });
    storageService.setGameSettings('1', gameS);
    const userConfig = storageService.getAppData('userConfigurable');
    userConfig.minimizeToTray = false;
    userConfig.beta = true;
    storageService.setAppData('userConfigurable', userConfig);
  }

  // Set new version
  storageService.setAppData('version', app.getVersion());

  // Set UUID if it doesn't exist
  if (storageService.getAppData('UUID') === '') {
    storageService.setAppData('UUID', uuidv4());
  }
}

export {
  getLatestTerms,
  getLatestPrivacy,
  setAppConfig,
};
