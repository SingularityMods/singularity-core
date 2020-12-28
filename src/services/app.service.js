import { app } from 'electron';
import axios from 'axios';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
import {
  enableSentry,
  disableSentry,
} from './sentry.service';

function toggleSentry(enabled) {
  if (enabled) {
    enableSentry();
  } else {
    disableSentry();
  }
}

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
  if (version < '1.2.0') {
    const gameS = {
      eso: {
        name: 'Elder Scrolls Online',
        nickName: 'ESO',
        shortName: 'eso',
        installed: false,
        sync: false,
        defaults: {
          trackBranch: 1,
          autoUpdate: false,
        },
        installPath: '',
        addonPath: '',
        settingsPath: '',
        installedAddons: [],
        unknownAddonDirs: [],
      },
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
          "C:/Program Files (x86)/Zenimax Online/",
          "C:/Games/"
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
      "addonDir": "Elder Scrolls Online/live/AddOns/",
      "settingsDir": "Elder Scrolls Online/live/SavedVariables/",
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
      "categories":[
        {
          "_id" : "5fce8ff66ea8bed82227ea3f",
          "categoryId" : 20017,
          "curseCategoryId" : 354,
          "mmouiCategoryId" : 96,
          "name" : "PvP",
          "slug" : "pvp",
          "gameId" : 2,
          "tukuiCategory" : null,
          "parentCategoryId" : 20000,
          "rootCategoryId" : 20000,
          "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Pvp.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea44",
                "categoryId" : 20021,
                "curseCategoryId" : 360,
                "mmouiCategoryId" : 21,
                "name" : "Unit Frames",
                "slug" : "unit-frames",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/UnitFrames.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea52",
                "categoryId" : 22901,
                "curseCategoryId" : 335,
                "mmouiCategoryId" : 149,
                "name" : "Damage Dealer",
                "slug" : "damage-dealer",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 333,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/DamageDealer.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea50",
                "categoryId" : 20804,
                "curseCategoryId" : 329,
                "mmouiCategoryId" : 56,
                "name" : "Templar",
                "slug" : "templar",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 327,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Templar.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea53",
                "categoryId" : 22902,
                "curseCategoryId" : 337,
                "mmouiCategoryId" : 150,
                "name" : "Healer",
                "slug" : "healer",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 333,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Healer.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea54",
                "categoryId" : 22903,
                "curseCategoryId" : 338,
                "mmouiCategoryId" : 151,
                "name" : "Tank",
                "slug" : "tank",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 333,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Tank.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea45",
                "categoryId" : 20022,
                "curseCategoryId" : 326,
                "mmouiCategoryId" : 27,
                "name" : "Miscellaneous",
                "slug" : "miscellaneous",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Misc.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea47",
                "categoryId" : 20024,
                "curseCategoryId" : 352,
                "mmouiCategoryId" : 53,
                "name" : "Libraries",
                "slug" : "libraries",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Libraries.png"
        },
        {
                "_id" : "5fcf165d8007c82c77ffe8f9",
                "categoryId" : 20030,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 147,
                "name" : "UI Media",
                "slug" : "ui-media",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/ESO.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea35",
                "categoryId" : 20007,
                "curseCategoryId" : 345,
                "mmouiCategoryId" : 55,
                "name" : "Chat and Communication",
                "slug" : "chat-and-communication",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Chat.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea32",
                "categoryId" : 20004,
                "curseCategoryId" : 350,
                "mmouiCategoryId" : 22,
                "name" : "Buffs and Debuffs",
                "slug" : "buffs-and-debuffs",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Buffs.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea33",
                "categoryId" : 20005,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 112,
                "name" : "Casting Bars and Cooldowns",
                "slug" : "casting-bars-cooldowns",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/ESO.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea34",
                "categoryId" : 20006,
                "curseCategoryId" : 357,
                "mmouiCategoryId" : 18,
                "name" : "Character Advancement",
                "slug" : "character-advancement",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Quest.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea36",
                "categoryId" : 20008,
                "curseCategoryId" : 327,
                "mmouiCategoryId" : 0,
                "name" : "Class Specific",
                "slug" : "class-specific",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Class.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea48",
                "categoryId" : 20025,
                "curseCategoryId" : 349,
                "mmouiCategoryId" : 0,
                "name" : "Development Tools",
                "slug" : "development-tools",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Development.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea42",
                "categoryId" : 20019,
                "curseCategoryId" : 339,
                "mmouiCategoryId" : 40,
                "name" : "Crafting",
                "slug" : "crafting",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Crafting.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea51",
                "categoryId" : 20805,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 0,
                "name" : "Warden",
                "slug" : "warden",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 327,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Warden.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea4c",
                "categoryId" : 20029,
                "curseCategoryId" : 333,
                "mmouiCategoryId" : 0,
                "name" : "Role Specific",
                "slug" : "role-specific",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Role.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea2f",
                "categoryId" : 20001,
                "curseCategoryId" : 332,
                "mmouiCategoryId" : 19,
                "name" : "Action Bars",
                "slug" : "action-bars",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/ActionBars.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea43",
                "categoryId" : 20020,
                "curseCategoryId" : 356,
                "mmouiCategoryId" : 98,
                "name" : "Tooltip",
                "slug" : "tooltip",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Tooltip.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea4d",
                "categoryId" : 20801,
                "curseCategoryId" : 328,
                "mmouiCategoryId" : 57,
                "name" : "Dragonknight",
                "slug" : "dragonknight",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 327,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Dragonknight.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea4e",
                "categoryId" : 20802,
                "curseCategoryId" : 336,
                "mmouiCategoryId" : 152,
                "name" : "Nightblade",
                "slug" : "nightblade",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 327,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Nightblade.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea41",
                "categoryId" : 20018,
                "curseCategoryId" : 355,
                "mmouiCategoryId" : 114,
                "name" : "Roleplaying",
                "slug" : "roleplaying",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Roleplaying.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea30",
                "categoryId" : 20002,
                "curseCategoryId" : 347,
                "mmouiCategoryId" : 94,
                "name" : "Auction and Economy",
                "slug" : "auction-and-economy",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Auction.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea37",
                "categoryId" : 20009,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 25,
                "name" : "Combat",
                "slug" : "combat",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/ESO.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea3c",
                "categoryId" : 20014,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 109,
                "name" : "Info, Plug-in Bars",
                "slug" : "info-plug-in",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/ESO.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea3e",
                "categoryId" : 20016,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 97,
                "name" : "Mail",
                "slug" : "mail",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/ESO.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea38",
                "categoryId" : 20010,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 26,
                "name" : "Data",
                "slug" : "data",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/ESO.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea31",
                "categoryId" : 20003,
                "curseCategoryId" : 348,
                "mmouiCategoryId" : 20,
                "name" : "Bags, Bank, and Inventory",
                "slug" : "bags-bank-and-inventory",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Bags.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea4f",
                "categoryId" : 20803,
                "curseCategoryId" : 329,
                "mmouiCategoryId" : 58,
                "name" : "Sorcerer",
                "slug" : "sorcerer",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 327,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Sorcerer.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea3b",
                "categoryId" : 20013,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 160,
                "name" : "Homestead",
                "slug" : "homestead",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/ESO.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea3a",
                "categoryId" : 20012,
                "curseCategoryId" : 351,
                "mmouiCategoryId" : 95,
                "name" : "Guild",
                "slug" : "guild",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Guild.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea40",
                "categoryId" : 20017,
                "curseCategoryId" : 361,
                "mmouiCategoryId" : 45,
                "name" : "Boss Encounters",
                "slug" : "boss-encounters",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Boss.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea46",
                "categoryId" : 20023,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 159,
                "name" : "Utilities",
                "slug" : "utilities",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/ESO.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea49",
                "categoryId" : 20026,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 88,
                "name" : "ESO Tools and Utilities",
                "slug" : "eso-tools",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Development.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea4a",
                "categoryId" : 20027,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 155,
                "name" : "Beta AddOns",
                "slug" : "beta-addons",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/ESO.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea4b",
                "categoryId" : 20028,
                "curseCategoryId" : null,
                "mmouiCategoryId" : 33,
                "name" : "Plugins",
                "slug" : "plugins",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Development.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea39",
                "categoryId" : 20011,
                "curseCategoryId" : 346,
                "mmouiCategoryId" : 17,
                "name" : "Graphic UI",
                "slug" : "ui",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Art.png"
        },
        {
                "_id" : "5fce8ff66ea8bed82227ea3d",
                "categoryId" : 20015,
                "curseCategoryId" : 358,
                "mmouiCategoryId" : 24,
                "name" : "Map",
                "slug" : "map",
                "gameId" : 2,
                "tukuiCategory" : null,
                "parentCategoryId" : 20000,
                "rootCategoryId" : 20000,
                "iconUrl" : "https://storage.singularitycdn.com/icons/categories/eso/Map.png"
        }  
      ]
    }
    setGameData('2', gameD);

    const wowD = getGameData('1');
    wowD.manifestFile = '.toc';
    wowD.likelyInstallPaths = {
      win: [
        'C:/Program Files (x86)/',
        'C:/Users/Public/Games/',
        'C:/',
      ],
      mac: ['/Applications/'],
      linux: ['C:/Program Files (x86)/'],
    };
    wowD.addonDir = 'Interface/Addons/';
    wowD.settingsDir = 'WTF/';
    wowD.addonDirLocation = {
      win: '%GAMEDIR%',
      mac: '%GAMEDIR%',
      linux: '%GAMEDIR%',
    };
    wowD.settingsDirLocation = {
      win: '%GAMEDIR%',
      mac: '%GAMEDIR%',
      linux: '%GAMEDIR%',
    };
    wowD.gameVersions.wow_retail.gameDir = {
      win: [
        'World of Warcraft/_retail_/Wow.exe',
      ],
      mac: ['World of Warcraft/_retail_/World of Warcraft.app'],
      linux: [
        'World of Warcraft/_retail_/Wow.exe',
      ],
    };
    wowD.gameVersions.wow_classic.gameDir = {
      win: [
        'World of Warcraft/_classic_/WowClassic.exe',
      ],
      mac: ['World of Warcraft/_classic_/World of Warcraft Classic.app'],
      linux: [
        'World of Warcraft/_classic_/WowClassic.exe',
      ],
    };
    wowD.gameVersions.wow_retail_ptr.gameDir = {
      win: [
        'World of Warcraft/_ptr_/WowT.exe',
      ],
      mac: ['World of Warcraft/_ptr_/World of Warcraft Test.app'],
      linux: [
        'World of Warcraft/_ptr_/WowT.exe',
      ],
    };
    wowD.gameVersions.wow_classic_ptr.gamedir = {
      win: [
        'World of Warcraft/_classic_ptr_/WowClassicT.exe',
      ],
      mac: ['World of Warcraft/_classic_ptr_/World of Warcraft Classic Test.app'],
      linux: [
        'World of Warcraft/_classic_ptr_/WowClassicT.exe',
      ],
    };
    wowD.gameVersions.wow_retail_beta.gameDir = {
      win: [
        'World of Warcraft/_beta_/WowB.exe',
      ],
      mac: ['World of Warcraft/_beta_/World of Warcraft Beta.app'],
      linux: [
        'World of Warcraft/_beta_/WowB.exe',
      ],
    };
    wowD.gameVersions.wow_classic_beta = {
      name: 'World of Warcraft Classic Beta',
      nickName: 'Classic Beta',
      shortName: 'wow-classic-beta',
      addonVersion: 'wow_classic',
      executable: 'WowClassicB.exe',
      macExecutable: 'World of Warcraft Classic Beta.app',
      gameDir: {
        win: [
          'World of Warcraft/_classic_beta_/WowClassicB.exe',
        ],
        mac: ['World of Warcraft/_classic_beta_/World of Warcraft Classic Beta.app'],
        linux: [
          'World of Warcraft/_classic_beta_/WowClassicB.exe',
        ],
      },
    };
    setGameData('1', wowD);

    const wowS = getGameSettings('1');
    wowS.wow_retail.addonPath = path.join(wowS.wow_retail.installPath, 'Interface', 'Addons');
    wowS.wow_retail.settingsPath = path.join(wowS.wow_retail.installPath, 'WTF');
    wowS.wow_classic.addonPath = path.join(wowS.wow_classic.installPath, 'Interface', 'Addons');
    wowS.wow_classic.settingsPath = path.join(wowS.wow_classic.installPath, 'WTF');
    wowS.wow_retail_ptr.addonPath = path.join(wowS.wow_retail_ptr.installPath, 'Interface', 'Addons');
    wowS.wow_retail_ptr.settingsPath = path.join(wowS.wow_retail_ptr.installPath, 'WTF');
    wowS.wow_classic_ptr.addonPath = path.join(wowS.wow_classic_ptr.installPath, 'Interface', 'Addons');
    wowS.wow_classic_ptr.settingsPath = path.join(wowS.wow_classic_ptr.installPath, 'WTF');
    wowS.wow_retail_beta.addonPath = path.join(wowS.wow_retail_beta.installPath, 'Interface', 'Addons');
    wowS.wow_retail_beta.settingsPath = path.join(wowS.wow_retail_beta.installPath, 'WTF');
    wowS.wow_classic_beta = {
      name: 'World of Warcraft Classic Beta',
      nickName: 'Classic Beta',
      shortName: 'wow-classic-beta',
      installed: false,
      defaults: {
        trackBranch: 1,
        autoUpdate: false,
      },
      installPath: '',
      addonPath: '',
      settingsPath: '',
      installedAddons: [],
      unknownAddonDirs: [],
    };
    setGameSettings('1', wowS);
    const userConfig = getAppData('userConfigurable');
    userConfig.telemetry = false;
    setAppData('userConfigurable', userConfig);

    const privSettings = getAppData('privacy');
    const tosSettings = getAppData('tos');
    const terms = {
      version: 1,
      accepted: privSettings.accepted && tosSettings.accepted,
    };
    delete privSettings.text;
    delete tosSettings.text;
    setAppData('privacy', privSettings);
    setAppData('tos', tosSettings);
    setAppData('terms', terms);
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
  toggleSentry,
};
