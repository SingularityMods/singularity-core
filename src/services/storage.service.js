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

function isGameVersionInstalled(gameId, gameVersion) {
  return gameSettings[gameId][gameVersion].installed;
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

function getInstalledAddons(gameId, gameVersion) {
  return gameSettings[gameId.toString()][gameVersion].installedAddons;
}

function getInstallDepsSetting(gameId, gameVersion) {
  return gameSettings[gameId.toString()][gameVersion].defaults.installDeps;
}

function getUninstallDepsSetting(gameId, gameVersion) {
  return gameSettings[gameId.toString()][gameVersion].defaults.uninstallDeps;
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

function getAddonDir(gameId, gameVersion) {
  const gameS = getGameSettings(gameId.toString());
  return gameS[gameVersion].addonPath;
}

function getAddonVersion(gameId, gameVersion) {
  const { gameVersions } = getGameData(gameId.toString());
  return gameVersions[gameVersion].addonVersion;
}

function getBannerPath(gameId) {
  const gameD = getGameData(gameId.toString());
  return gameD.bannerPath;
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

function addDependencies(gameId, gameVersion, installedAddon) {
  const gameS = getGameSettings(gameId.toString());
  const { dependencies, installedAddons } = gameS[gameVersion];
  const newDeps = [];
  installedAddon.installedFile.dependencies.forEach((dependency) => {
    if (dependency.name in dependencies) {
      const depList = dependencies[dependency.name].dependencyFor
        .filter((obj) => obj.addonId !== installedAddon.addonId);
      depList.push({
        addonId: installedAddon.addonId,
        addonName: installedAddon.addonName,
      });
      dependencies[dependency.name].dependencyFor = depList;
      let installed = false;
      installedAddons.forEach((addon) => {
        if (addon.addonId === dependency.addonId) {
          installed = true;
        }
      });
      if (!installed) {
        newDeps.push(dependency);
      }
    } else {
      dependencies[dependency.name] = {
        addonName: '',
        addonId: dependency.addonId,
        installedFileId: '',
        installedVersion: '',
        dependencyFor: [{
          addonId: installedAddon.addonId,
          addonName: installedAddon.addonName,
        }],
      };
      newDeps.push(dependency);
    }
  });
  gameS[gameVersion].dependencies = dependencies;
  setGameSettings(gameId.toString(), gameS);
  return newDeps;
}

function removeDependencies(gameId, gameVersion, installedAddon) {
  const gameS = getGameSettings(gameId.toString());
  const { dependencies } = gameS[gameVersion];
  const toRemove = [];
  if (installedAddon.installedFile.dependencies) {
    installedAddon.installedFile.dependencies.forEach((dependency) => {
      if (dependency.name in dependencies) {
        const depList = dependencies[dependency.name].dependencyFor
          .filter((obj) => obj.addonId !== installedAddon.addonId);
        if (depList.length === 0) {
          toRemove.push(dependency);
          delete dependencies[dependency.name];
        } else {
          dependencies[dependency.name].dependencyFor = depList;
        }
      }
    });
    gameS[gameVersion].dependencies = dependencies;
    setGameSettings(gameId.toString(), gameS);
  }
  return toRemove;
}

function updateDependencyInfo(gameId, gameVersion, dependencyName, installedAddon) {
  const gameS = getGameSettings(gameId.toString());
  const dep = gameS[gameVersion].dependencies[dependencyName];
  dep.addonName = installedAddon.addonName;
  dep.installedFileId = installedAddon.installedFile.fileId;
  dep.installedVersion = installedAddon.installedFile.version;
  gameS[gameVersion].dependencies[dependencyName] = dep;
  setGameSettings(gameId.toString(), gameS);
  return installedAddon;
}

function handleFingerprintResponse(gameId, gameVersion, addons, hashMap, win) {
  return new Promise((resolve) => {
    const gameS = getGameSettings(gameId.toString());
    const { gameVersions } = getGameData(gameId.toString());
    const { addonVersion } = gameVersions[gameVersion];
    const {
      defaults,
      installedAddons,
    } = gameS[gameVersion];
    const identifiedAddons = [];
    const unknownDirs = [];
    const identifiedDirs = [];

    if (addons && addons.length > 0) {
      log.info(`At least one addon identified for ${gameVersion}`);
      addons.forEach((addon) => {
        const identifiedAddon = addon;
        const installedVersion = installedAddons.find((a) => (
          a.addonId === identifiedAddon.addonId
        ));
        if (installedVersion) {
          identifiedAddon.trackBranch = installedVersion.trackBranch
            || defaults.trackBranch;
          identifiedAddon.autoUpdate = installedVersion.autoUpdate
            || defaults.autoUpdate;
          identifiedAddon.ignoreUpdate = installedVersion.ignoreUpdate || false;
        } else {
          identifiedAddon.trackBranch = defaults.trackBranch;
          identifiedAddon.autoUpdate = defaults.autoUpdate;
          identifiedAddon.ignoreUpdate = false;
        }

        identifiedAddon.updateAvailable = false;
        identifiedAddon.updateFile = {};
        identifiedAddon.unknownUpdate = false;
        identifiedAddon.brokenInstallation = false;

        const possibleFiles = identifiedAddon.latestFiles.filter((file) => (
          file.releaseType <= identifiedAddon.trackBranch
          && file.gameVersionFlavor === addonVersion
        ));
        if (possibleFiles && possibleFiles.length > 0) {
          const latestFile = possibleFiles.reduce((a, b) => (
            a.fileDate > b.fileDate ? a : b
          ));
          if (latestFile.fileDate > identifiedAddon.installedFile.fileDate) {
            identifiedAddon.updateAvailable = true;
            identifiedAddon.updateFile = latestFile;
          }
        }

        identifiedAddons.push(identifiedAddon);
        addDependencies(gameId, gameVersion, identifiedAddon);
        if (identifiedAddon.installedFile.directories
            && identifiedAddon.installedFile.directories.length > 0) {
          identifiedAddon.installedFile.directories.forEach((module) => {
            identifiedDirs.push(module.folderName);
          });
        }
      });
    } else {
      log.info(`No addon identified for ${gameVersion}`);
    }
    Object.keys(hashMap).forEach((dir) => {
      if (!identifiedDirs.includes(dir)) {
        unknownDirs.push(dir);
      }
    });

    if (unknownDirs.length > 0) {
      installedAddons.forEach((addon) => {
        const addonDirs = [];
        if (addon.installedFile.directories) {
          addon.installedFile.directories.forEach((module) => {
            addonDirs.push(module.folderName);
          });
        }
        if (addonDirs.every((v) => unknownDirs.includes(v))) {
          const identifiedAddon = addon;
          identifiedAddon.unknownUpdate = true;
          if (!identifiedAddons.some((e) => e.addonId === identifiedAddon.addonId)) {
            log.info(`Unknown update installed for addon ${identifiedAddon.addonName}`);
            identifiedAddons.push(identifiedAddon);
          }
        } else if (addonDirs.some((v) => unknownDirs.includes(v))) {
          const identifiedAddon = addon;
          identifiedAddon.brokenInstallation = true;
          if (!identifiedAddons.some((e) => e.addonId === identifiedAddon.addonId)) {
            log.info(`Potentially broken installation for addon ${identifiedAddon.addonName}`);
            identifiedAddons.push(identifiedAddon);
          }
        }
      });
    }
    const newGameS = getGameSettings(gameId.toString());
    if (identifiedAddons && identifiedAddons.length > 0) {
      identifiedAddons.forEach((a) => {
        const { dependencies } = newGameS[gameVersion];
        Object.entries(dependencies).forEach(([dependency]) => {
          if (dependencies[dependency].addonId === a.addonId) {
            updateDependencyInfo(gameId, gameVersion, dependency, a);
          }
        });
      });
    }
    newGameS[gameVersion].installedAddons = identifiedAddons;
    newGameS[gameVersion].unknownAddonDirs = unknownDirs;
    setGameSettings(gameId.toString(), newGameS);
    log.info(`${gameVersion} - ${identifiedAddons.length} addons installed & ${unknownDirs.length} directories unknown`);
    if (win) {
      win.webContents.send('addons-found', identifiedAddons, gameVersion);
    }
    resolve({ gameId, gameVersion, addons: identifiedAddons });
  });
}

function updateInstalledAddonInfo(gameId, gameVersion, addon, fileInfo) {
  log.info(`Updating installed addon info for ${addon.addonName}`);
  const gameS = getGameSettings(gameId.toString());
  const { gameVersions } = getGameData(gameId.toString());
  const { addonVersion } = gameVersions[gameVersion];
  const { defaults } = gameS[gameVersion];
  let updateAvailable = false;
  let updateFile = {};
  const trackBranch = addon.trackBranch || defaults.trackBranch;
  const autoUpdate = addon.autoUpdate || defaults.autoUpdate;
  const ignoreUpdate = addon.ignoreUpdate || false;
  const possibleFiles = addon.latestFiles.filter((file) => (
    (file.releaseType <= trackBranch || file.releaseType <= fileInfo.releaseType)
      && file.gameVersionFlavor === addonVersion
  ));
  if (possibleFiles && possibleFiles.length > 0) {
    const latestFile = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
    if (fileInfo.fileDate < latestFile.fileDate) {
      updateAvailable = true;
      updateFile = latestFile;
    }
  }
  let author = '';
  if (addon.author) {
    author = addon.author;
  } else if (addon.authors) {
    const [firstAuthor] = addon.authors;
    author = firstAuthor;
  } else if (addon.curseAuthors) {
    const [firstAuthor] = addon.curseAuthors;
    author = firstAuthor.name;
  } else if (addon.tukuiAuthor) {
    author = addon.tukuiAuthor;
  } else if (addon.wowIntAuthor) {
    author = addon.wowIntAuthor;
  } else if (addon.mmouiAuthor) {
    author = addon.mmouiAuthor;
  }
  const installedAddon = {
    addonName: addon.addonName,
    addonId: addon.addonId,
    avatar: addon.avatar,
    primaryCategory: addon.primaryCategory,
    author,
    latestFiles: addon.latestFiles,
    installedFile: fileInfo,
    updateAvailable,
    updatefile: updateFile,
    trackBranch,
    autoUpdate,
    ignoreUpdate,
    brokenInstallation: false,
    unknownUpdate: false,
    gameId,
    gameVersion,
  };

  const installedAddons = gameS[gameVersion].installedAddons
    .filter((obj) => obj.addonId !== installedAddon.addonId);
  installedAddons.push(installedAddon);
  gameS[gameVersion].installedAddons = installedAddons;
  setGameSettings(gameId.toString(), gameS);
  return installedAddon;
}

function removeInstalledAddonInfo(gameId, gameVersion, addonId) {
  const gameS = getGameSettings(gameId.toString());
  let { installedAddons } = gameS[gameVersion];
  installedAddons = installedAddons.filter((obj) => obj.addonId !== addonId);
  gameS[gameVersion].installedAddons = installedAddons;
  setGameSettings(gameId.toString(), gameS);
  return addonId;
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
  getInstalledAddons,
  getGameSettings,
  getAddonDir,
  getAddonVersion,
  getAppData,
  getGameData,
  getBackupData,
  getCategories,
  getBannerPath,
  setGameSettings,
  setAppData,
  setGameData,
  setBackupData,
  getBackupDataAsync,
  handleFingerprintResponse,
  isGameVersionInstalled,
  setBackupDataAsync,
  saveBackupInfo,
  deleteBackupInfo,
  getLocalAddonSyncProfile,
  setLocalAddonSyncProfile,
  updateInstalledAddonInfo,
  removeInstalledAddonInfo,
  addDependencies,
  removeDependencies,
  updateDependencyInfo,
  getInstallDepsSetting,
  getUninstallDepsSetting,
};
