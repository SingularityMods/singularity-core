import { app } from 'electron';
import path from 'path';
import fs, { promises as fsPromises } from 'fs';
import log from 'electron-log';
import gameDataDefaults from './storage-service-defaults/gameData.json';
import gameSettingsDefaults from './storage-service-defaults/gameSettings.json';
import appDataDefaults from './storage-service-defaults/appData.json';
import backupDataDefaults from './storage-service-defaults/backupData.json';
import syncProfileDefault from './storage-service-defaults/syncProfile.json';
import categoryDefaults from './storage-service-defaults/categories.json';

const userDataPath = (app).getPath('userData');

let gameSettings = null;
let appData = null;
let gameData = null;
let categories = null;

function initStorage() {
  log.info('Initializing data storage');
  try {
    const filePath = path.join(userDataPath, 'game-settings.json');
    gameSettings = JSON.parse(fs.readFileSync(filePath));
  } catch (error) {
    log.info('Using default game settings');
    gameSettings = gameSettingsDefaults;
  }
  try {
    const filePath = path.join(userDataPath, 'app-data.json');
    appData = JSON.parse(fs.readFileSync(filePath));
  } catch (error) {
    log.info('Using default app settings');
    appData = appDataDefaults;
  }
  try {
    const filePath = path.join(userDataPath, 'game-data.json');
    gameData = JSON.parse(fs.readFileSync(filePath));
  } catch (error) {
    log.info('Using default game data');
    gameData = gameDataDefaults;
  }
  try {
    const filePath = path.join(userDataPath, 'category-data.json');
    categories = JSON.parse(fs.readFileSync(filePath));
  } catch (error) {
    log.info('Using default Category data');
    categories = categoryDefaults;
  }
  /*
    try {
        let filePath = path.join(userDataPath, 'backup-data.json');
        backupData = JSON.parse(fs.readFileSync(filePath));
    } catch (error) {
        log.info("Using default backup data");
        backupData = backupDataDefaults;
    } */
}

function getGameSettings(key) {
  return gameSettings[key];
}

function getAppData(key) {
  return appData[key];
}

function getGameData(key) {
  return gameData[key];
}

function getCategories(key) {
  return categories[key];
}

function getLocalAddonSyncProfile(gameId, gameVersion) {
  return new Promise((resolve) => {
    const filePath = path.join(userDataPath, 'sync', gameId.toString(), gameVersion, 'sync-profile.json');
    fsPromises.readFile(filePath)
      .then((fileData) => {
        resolve(JSON.parse(fileData));
      })
      .catch(() => {
        log.info('User has no sync profile for that game verison yet, returning blank profile');
        let syncProfile = {};
        syncProfile = Object.assign(syncProfile, syncProfileDefault);
        resolve(syncProfile);
      });
  });
}

function getBackupData(key) {
  const filePath = path.join(userDataPath, 'backup-data.json');
  let backupData;
  try {
    backupData = JSON.parse(fs.readFileSync(filePath));
  } catch (error) {
    log.info('User has no backup data, returning defaults');
    backupData = backupDataDefaults;
  }
  return backupData[key];
}

function getBackupDataAsync(key) {
  return new Promise((resolve) => {
    const filePath = path.join(userDataPath, 'backup-data.json');
    fsPromises.readFile(filePath)
      .then((fileData) => {
        const backupData = JSON.parse(fileData);
        resolve(backupData[key]);
      })
      .catch(() => {
        log.info('User has no backup data, returning defaults');
        const backupData = backupDataDefaults;
        resolve(backupData[key]);
      });
  });
}

function getInstalledGames() {
  const installed = [];
  Object.keys(gameSettings).forEach((gameId) => {
    let gameInstalled = false;
    Object.keys(gameSettings[gameId]).forEach((gameVersion) => {
      if (gameSettings[gameId][gameVersion].installed) {
        gameInstalled = true;
      }
    });
    if (gameInstalled) {
      installed.push(gameId);
    }
  });
  return installed;
}

function setGameSettings(key, val) {
  gameSettings[key] = val;
  const filePath = path.join(userDataPath, 'game-settings.json');
  fs.writeFileSync(filePath, JSON.stringify(gameSettings));
}

function setAppData(key, val) {
  appData[key] = val;
  const filePath = path.join(userDataPath, 'app-data.json');
  fs.writeFileSync(filePath, JSON.stringify(appData));
}

function setGameData(key, val) {
  gameData[key] = val;
  const filePath = path.join(userDataPath, 'game-data.json');
  fs.writeFileSync(filePath, JSON.stringify(gameData));
}

function setLocalAddonSyncProfile(profile) {
  return new Promise((resolve, reject) => {
    const basePath = path.join(userDataPath, 'sync', profile.gameId.toString(), profile.gameVersion);
    fsPromises.mkdir(basePath, { recursive: true })
      .then(() => {
        const filePath = path.join(basePath, 'sync-profile.json');
        return fsPromises.writeFile(filePath, JSON.stringify(profile));
      })
      .then(() => {
        resolve({});
      })
      .catch((err) => {
        log.error(err);
        reject(new Error('Error writing sync profile'));
      });
  });
}

function setBackupDataAsync(key, val) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(userDataPath, 'backup-data.json');
    fsPromises.readFile(filePath)
      .then((fileData) => {
        const backupData = JSON.parse(fileData);
        backupData[key] = val;
        fsPromises.writeFile(filePath, JSON.stringify(backupData))
          .then(() => {
            resolve({});
          })
          .catch((err) => {
            log.error(err);
            reject(new Error('Error writing backup data'));
          });
      })
      .catch(() => {
        log.info('User has no backup data, creating new file');
        const backupData = backupDataDefaults;
        backupData[key] = val;
        fsPromises.writeFile(filePath, JSON.stringify(backupData))
          .then(() => {
            resolve({});
          })
          .catch((err) => {
            log.error(err);
            reject(new Error('Error writing backup data'));
          });
      });
  });
}

function saveBackupInfo(gameId, gameVersion, data) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(userDataPath, 'backup-data.json');
    fsPromises.readFile(filePath)
      .then((fileData) => {
        const backupData = JSON.parse(fileData);
        backupData[gameId][gameVersion].backups.push(data);
        fsPromises.writeFile(filePath, JSON.stringify(backupData))
          .then(() => {
            resolve({});
          })
          .catch((err) => {
            log.error(err);
            reject(new Error('Error writing backup data'));
          });
      })
      .catch(() => {
        log.info('User has no backup data, creating new file');
        const backupData = backupDataDefaults;
        backupData[gameId][gameVersion].backups.push(data);
        fsPromises.writeFile(filePath, JSON.stringify(backupData))
          .then(() => {
            resolve({});
          })
          .catch((err) => {
            log.error(err);
            reject(new Error('Error writing backup data'));
          });
      });
  });
}

function deleteBackupInfo(gameId, gameVersion, data) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(userDataPath, 'backup-data.json');
    fsPromises.readFile(filePath)
      .then((fileData) => {
        const backupData = JSON.parse(fileData);
        backupData[gameId][gameVersion].backups = backupData[gameId][gameVersion].backups
          .filter((item) => item.backupUUID !== data.backupUUID);
        fsPromises.writeFile(filePath, JSON.stringify(backupData))
          .then(() => {
            resolve({});
          })
          .catch((err) => {
            log.error(err);
            reject(new Error('Error writing backup data'));
          });
      })
      .catch(() => {
        log.info('User has no backup data, creating new file');
        const backupData = backupDataDefaults;
        backupData[gameId][gameVersion].backups = backupData[gameId][gameVersion].backups
          .filter((item) => item.backupUUID !== data.backupUUID);
        fsPromises.writeFile(filePath, JSON.stringify(backupData))
          .then(() => {
            resolve({});
          })
          .catch((err) => {
            log.error(err);
            reject(new Error('Error writing backup data'));
          });
      });
  });
}

function setBackupData(key, val) {
  const filePath = path.join(userDataPath, 'backup-data.json');
  let backupData;
  try {
    backupData = JSON.parse(fs.readFileSync(filePath));
  } catch (error) {
    log.info('User has no backup data, creating new file');
    backupData = backupDataDefaults;
  }

  backupData[key] = val;
  fs.writeFileSync(filePath, JSON.stringify(backupData));
}

export {
  initStorage,
  getInstalledGames,
  getGameSettings,
  getAppData,
  getGameData,
  getBackupData,
  getCategories,
  setGameSettings,
  setAppData,
  setGameData,
  setBackupData,
  getBackupDataAsync,
  setBackupDataAsync,
  saveBackupInfo,
  deleteBackupInfo,
  getLocalAddonSyncProfile,
  setLocalAddonSyncProfile,
};
