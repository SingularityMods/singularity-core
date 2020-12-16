import { app } from 'electron';
import axios from 'axios';
import path from 'path';
import { vf as uuidv4 } from 'uuid';
import log from 'electron-log';

import AppConfig from '../config/app.config';
import {
  getGameSettings,
  getAppData,
  getGameData,
  setGameSettings,
  setAppData,
  setGameData,
} from './storage.service';

function getLatestTerms() {
  log.info('Checking for latest ToS');
  return new Promise((resolve, reject) => {
    const axiosConfig = {
      headers: {
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-app-uuid': getAppData('UUID'),
      },
    };
    axios.get(`${AppConfig.API_URL}app/latest/tos`, axiosConfig)
      .then((response) => {
        if (response.status === 200) {
          const tos = response.data;
          const currentTos = getAppData('tos');
          if (tos.version > currentTos.version) {
            currentTos.version = tos.version;
            currentTos.accepted = false;
            currentTos.text = tos.text;
            setAppData('tos', currentTos);
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
        'x-app-uuid': getAppData('UUID'),
      },
    };
    axios.get(`${AppConfig.API_URL}app/latest/privacy`, axiosConfig)
      .then((response) => {
        if (response.status === 200) {
          const privacy = response.data;
          const currentPrivacy = getAppData('privacy');
          if (privacy.version > currentPrivacy.version) {
            currentPrivacy.version = privacy.version;
            currentPrivacy.accepted = false;
            currentPrivacy.text = privacy.text;
            setAppData('privacy', currentPrivacy);
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
  const version = getAppData('version');

  if (version < '0.3.0') {
    const gameD = getGameData('1');
    gameD.gameVersions.wow_retail.settingsBackup = '';
    gameD.gameVersions.wow_retail.addonBackup = '';
    gameD.gameVersions.wow_classic.settingsBackup = '';
    gameD.gameVersions.wow_classic.addonBackup = '';
    gameD.gameVersions.wow_retail_ptr.settingsBackup = '';
    gameD.gameVersions.wow_retail_ptr.addonBackup = '';
    gameD.gameVersions.wow_classic_ptr.settingsBackup = '';
    gameD.gameVersions.wow_classic_ptr.addonBackup = '';
    setGameData('1', gameD);
  }
  if (version < '0.3.2') {
    const gameS = getGameSettings('1');
    gameS.wow_retail_beta = {
      name: 'World of Warcraft Beta',
      nickName: 'Beta',
      shortName: 'wow-retail-beta',
      installed: false,
      installPath: 'C:\\Program Files (x86)\\World of Warcraft\\_beta_\\',
      installedAddons: [],
      unknownAddonDirs: [],
    };
    setGameSettings('1', gameS);
    const gameD = getGameData('1');
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
    setGameData('1', gameD);
  }
  if (version < '0.4.0') {
    const wowData = getGameData('1');
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
      setGameData('1', wowData);
    }
  }
  if (version < '0.5.0') {
    const gameS = getGameSettings('1');
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
      setGameSettings('1', gameS);
    });
  }
  if (version < '0.6.0') {
    const gameS = getGameSettings('1');
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
    setGameSettings('1', gameS);
    const wowData = getGameData('1');
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
    setGameData('1', wowData);
    const userConf = getAppData('userConfigurable');
    if (!('defaultWowVersion' in userConf)) {
      userConf.defaultWowVersion = 'wow_retail';
    }
    setAppData('userConfigurable', userConf);
  }

  if (version < '1.0.0') {
    setAppData('sidebarMinimized', false);
  }

  if (version < '1.1.0') {
    const gameS = getGameSettings('1');
    Object.entries(gameS).forEach((gameVersion) => {
      gameS[gameVersion].sync = false;
      gameS[gameVersion].defaults = {
        trackBranch: 1,
        autoUpdate: false,
      };
    });
    setGameSettings('1', gameS);
    const userConfig = getAppData('userConfigurable');
    userConfig.minimizeToTray = false;
    userConfig.beta = false;
    setAppData('userConfigurable', userConfig);
  }

  if (version < app.getVersion()) {
    const gameS = {
      "eso": {
        "name": "Elder Scrolls Online",
        "nickName": "ESO",
        "shortName": "eso",
        "installed": false,
        "sync": false,
        "defaults": {
          "trackBranch": 1,
          "autoUpdate": false
        },
        "installPath": "",
        "addonPath": "",
        "settingsPath": "",
        "installedAddons": [],
        "unknownAddonDirs": []
      }
    };
    setGameSettings('2', gameS);
    const gameD = {
      "name": "Elder Scrolls Online",
      "bannerPath": "../img/banners/eso-banner.png",
      "iconPath": "../img/icons/eso-icon.png",
      "tilePath": "../img/tiles/eso-tile.png",
      "manifestFile" : ".txt",
      "likelyInstallPaths":{
        "win":[
          "C:/Program Files (x86)/Steam/steamapps/common/Zenimax Online/",
          "C:/Program Files (x86)/Zenimax Online/"
        ],
        "mac":[
          "%USERDATA%/Steam/steamapps/common/Zenimax Online/",
          "/Applications/Zenimax Online/",
          "/Applications/Games/ESO/"],
        "linux":[
          "C:/Program Files (x86)/Steam/steamapps/common/Zenimax Online/",
          "C:/Program Files (x86)/Zenimax Online/"
        ]
      },
      "addonDir": "Elder Scrolls Online/live/AddoOns/",
      "settingsDir": "Elder Scrolls Online/live/AddOns/",
      "addonDirLocation":{
        "win":"%DOCUMENTS%",
        "mac":"%DOCUMENTS%",
        "linux":"%DOCUMENTS%"
      },
      "settingsDirLocation":{
        "win":"%DOCUMENTS%",
        "mac":"%DOCUMENTS%",
        "linux":"%DOCUMENTS%"
      },
      "gameVersions": {
        "eso": {
          "name": "Elder Scrolls Online",
          "nickName": "ESO",
          "shortName": "eso",
          "addonVersion": "eso",
          "flavorString": "eso",
          "gameDir": {
            "win": [
              "The Elder Scrolls Online/game/client/eso.exe",
              "The Elder Scrolls Online/game/client/eso64.exe"
            ],
            "mac": ["The Elder Scrolls Online/game_mac/pubplayerclient/eso.app"],
            "linux": [
              "The Elder Scrolls Online/game/client/eso.exe",
              "The Elder Scrolls Online/game/client/eso64.exe"
            ]
          }
        }
      },
      "categories":[]
    };
    setGameData('2', gameD);

    const wowD = getGameData('1')
    wowD.manifestFile = '.toc';
    wowD.likelyInstallPaths = {
      "win":[
        "C:/Program Files (x86)/",
        "C:/Users/Public/Games/",
        "C:/"
      ],
      "mac":["/Applications/"],
      "linux":["C:/Program Files (x86)/"]
    };
    wowD.addonDir = "Interface/Addons/";
    wowD.settingsDir = "WTF/";
    wowD.addonDirLocation = {
      "win":"%GAMEDIR%",
      "mac":"%GAMEDIR%",
      "linux":"%GAMEDIR%"
    };
    wowD.settingsDirLocation = {
      "win":"%GAMEDIR%",
      "mac":"%GAMEDIR%",
      "linux":"%GAMEDIR%"
    };
    wowD.gameVersions.wow_retail.gameDir = {
      "win": [
        "World of Warcraft/_retail_/Wow.exe"
      ],
      "mac": ["World of Warcraft/_retail_/World of Warcraft.app"],
      "linux": [
        "World of Warcraft/_retail_/Wow.exe"
      ]
    };
    wowD.gameVersions.wow_classic.gameDir = {
      "win": [
        "World of Warcraft/_classic_/WowClassic.exe"
      ],
      "mac": ["World of Warcraft/_classic_/World of Warcraft Classic.app"],
      "linux": [
        "World of Warcraft/_classic_/WowClassic.exe"
      ]
    };
    wowD.gameVersions.wow_retail_ptr.gameDir = {
      "win": [
        "World of Warcraft/_ptr_/WowT.exe"
      ],
      "mac": ["World of Warcraft/_ptr_/World of Warcraft Test.app"],
      "linux": [
        "World of Warcraft/_ptr_/WowT.exe"
      ]
    };
    wowD.gameVersions.wow_classic_ptr.gamedir = {
      "win": [
        "World of Warcraft/_classic_ptr_/WowClassicT.exe"
      ],
      "mac": ["World of Warcraft/_classic_ptr_/World of Warcraft Classic Test.app"],
      "linux": [
        "World of Warcraft/_classic_ptr_/WowClassicT.exe"
      ]
    }
    wowD.gameVersions.wow_retail_beta.gameDir = {
      "win": [
        "World of Warcraft/_beta_/WowB.exe"
      ],
      "mac": ["World of Warcraft/_beta_/World of Warcraft Beta.app"],
      "linux": [
        "World of Warcraft/_beta_/WowB.exe"
      ]
    }
    wowD.gameVersions.wow_classic_beta = {
      "name": "World of Warcraft Classic Beta",
      "nickName": "Classic Beta",
      "shortName": "wow-classic-beta",
      "addonVersion": "wow_classic",
      "executable": "WowClassicB.exe",
      "macExecutable": "World of Warcraft Classic Beta.app",
      "gameDir": {
        "win": [
          "World of Warcraft/_classic_beta_/WowClassicB.exe"
        ],
        "mac": ["World of Warcraft/_classic_beta_/World of Warcraft Classic Beta.app"],
        "linux": [
          "World of Warcraft/_classic_beta_/WowClassicB.exe"
        ]
      }
    };
    setGameData('1',wowD)

    const wowS = getGameSettings('1');
    wowS.wow_retail.addonPath = path.join(wowS.wow_retail.installPath,'Interface','Addons')
    wowS.wow_retail.settingsPath = path.join(wowS.wow_retail.installPath,'WTF')
    wowS.wow_classic.addonPath = path.join(wowS.wow_classic.installPath,'Interface','Addons')
    wowS.wow_classic.settingsPath = path.join(wowS.wow_classic.installPath,'WTF')
    wowS.wow_retail_ptr.addonPath = path.join(wowS.wow_retail_ptr.installPath,'Interface','Addons')
    wowS.wow_retail_ptr.settingsPath = path.join(wowS.wow_retail_ptr.installPath,'WTF')
    wowS.wow_classic_ptr.addonPath = path.join(wowS.wow_classic_ptr.installPath,'Interface','Addons')
    wowS.wow_classic_ptr.settingsPath = path.join(wowS.wow_classic_ptr.installPath,'WTF')
    wowS.wow_retail_beta.addonPath = path.join(wowS.wow_retail_beta.installPath,'Interface','Addons')
    wowS.wow_retail_beta.settingsPath = path.join(wowS.wow_retail_beta.installPath,'WTF')
    wowS.wow_classic_beta = {
      "name": "World of Warcraft Classic Beta",
      "nickName": "Classic Beta",
      "shortName": "wow-classic-beta",
      "installed": false,
      "defaults": {
        "trackBranch": 1,
        "autoUpdate": false
      },
      "installPath": "",
      "addonPath": "",
      "settingsPath": "",
      "installedAddons": [],
      "unknownAddonDirs": []
    }
    setGameSettings('1',wowS);
  }

  // Set new version
  setAppData('version', app.getVersion());

  // Set UUID if it doesn't exist
  if (getAppData('UUID') === '') {
    setAppData('UUID', uuidv4());
  }
}

export {
  getLatestTerms,
  getLatestPrivacy,
  setAppConfig,
};
