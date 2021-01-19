import { app } from 'electron';
import { download } from 'electron-dl';
import extract from 'extract-zip';
import { ncp } from 'ncp';
import archiver from 'archiver';
import path from 'path';
import fs, { promises as fsPromises } from 'fs';
import hasha from 'hasha';
import streamBuffers from 'stream-buffers';
import PromisePool from 'es6-promise-pool';
import axios from 'axios';

import log from 'electron-log';
import { getMainBrowserWindow } from './electron.service';

import {
  isAuthenticated,
  getAccessToken,

} from './auth.service';
import {
  getAddonInfo,
  getAddonDownloadUrl,
  getAddonsFromFingerprints,
} from './singularity.service';
import {
  addDependencies,
  removeDependencies,
  getGameSettings,
  getAppData,
  getGameData,
  getInstalledGames,
  setGameSettings,
  handleFingerprintResponse,
  setAppData,
  deleteBackupInfo,
  getLocalAddonSyncProfile,
  updateDependencyInfo,
  updateInstalledAddonInfo,
  removeInstalledAddonInfo,
  getInstallDepsSetting,
  getUninstallDepsSetting,
} from './storage.service';

let syncing = false;

const snycProfilesToProcess = [];
const syncProfilesToCreate = [];

ncp.limit = 16;

const autoUpdateAddonsLeft = [];
let cloudAddonsToRestore = [];

const syncedAddonsToInstall = [];
const syncedAddonsToRemove = [];

const dependenciesToInstall = [];
const dependenciesToRemove = [];

let updateInterval;

function createAndSaveSyncProfile(obj) {
  return new Promise((resolve, reject) => {
    log.info(`Updating sync profile for ${obj.gameVersion}`);
    const win = getMainBrowserWindow();
    if (win) {
      win.webContents.send('sync-status', obj.gameId, obj.gameVersion, 'creating-profile', null, null);
    }
    const syncProfile = createSyncProfileObj(obj.gameId, obj.gameVersion);
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-auth': getAccessToken(),
      },
    };
    axios.post('https://api.singularitymods.com/api/v1/user/sync/set', syncProfile, axiosConfig)
      .then((res) => {
        if (res && res.status === 200 && res.data.success) {
          resolve({});
        } else {
          log.error('Error pushing sync profile to the cloud');
          reject(new Error('Error pushing sync profile to the cloud'));
        }
      })
      .catch((err) => {
        log.error('Error creating and saving sync profile');
        log.error(err);
        reject(new Error('Error creating and saving sync profile'));
      });
  });
}

function createGranularBackupObj(gameId, gameVersion) {
  return new Promise((resolve, reject) => {
    const gameS = getGameSettings(gameId.toString());
    const { installedAddons, settingsPath } = gameS[gameVersion];
    const addonBackup = [];
    installedAddons.forEach((addon) => {
      addonBackup.push(
        {
          addonId: addon.addonId,
          addonName: addon.addonName,
          fileId: addon.installedFile.fileId,
          fileName: addon.installedFile.fileName,
          fileDate: addon.installedFile.fileDate,
          downloadUrl: addon.installedFile.downloadUrl,
          releaseType: addon.installedFile.releaseType,
          gameVersion: addon.installedFile.gameVersion,
        },
      );
    });
    if (!fs.existsSync(settingsPath)) {
      reject(new Error("Settings directory doesn't exist"));
    }
    const outputStreamBuffer = new streamBuffers.WritableStreamBuffer({
      initialSize: (1000 * 1024), // start at 1000 kilobytes.
      incrementAmount: (1000 * 1024), // grow by 1000 kilobytes each time buffer overflows.
    });

    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level.
    });

    archive.on('warning', (archiveWarn) => {
      if (archiveWarn.code === 'ENOENT') {
        log.error(archiveWarn);
      } else {
        // throw error
        log.error(archiveWarn);
        reject(archiveWarn);
      }
    });

    archive.on('error', (archiveErr) => {
      log.error(archiveErr);
      reject(archiveErr);
    });

    outputStreamBuffer.on('finish', () => {
      const buff = outputStreamBuffer.getContents();
      resolve({
        encodedFile: buff.toString('base64'),
        addons: addonBackup,
      });
    });

    archive.pipe(outputStreamBuffer);
    archive.directory(settingsPath, false);
    archive.finalize();
  });
}

function createSyncProfileObj(gameId, gameVersion) {
  const gameS = getGameSettings(gameId.toString());
  const { installedAddons } = gameS[gameVersion];
  const addons = [];
  installedAddons.forEach((addon) => {
    addons.push(
      {
        addonId: addon.addonId,
        addonName: addon.addonName,
        trackBranch: addon.trackBranch,
        autoUpdate: addon.autoUpdate,
        fileId: addon.installedFile.fileId,
        fileName: addon.installedFile.fileName,
        fileDate: addon.installedFile.fileDate,
        downloadUrl: addon.installedFile.downloadUrl,
        releaseType: addon.installedFile.releaseType,
        gameVersion: addon.installedFile.gameVersion,
      },
    );
  });
  return {
    gameId,
    uuid: getAppData('UUID'),
    gameVersion,
    addons,
  };
}

function deleteLocalBackup(backup) {
  return new Promise((resolve, reject) => {
    deleteBackupInfo(backup.gameId.toString(), backup.gameVersion, backup)
      .then(() => {
        resolve();
      })
      .catch(() => {
        reject(new Error('Error deleting backup data'));
      });
  });
}

// For each game and game version, fingerprint the installed addons and
// pass them to the identifyAddons function to identify them.
function findAndUpdateAddons() {
  return new Promise((resolve, reject) => {
    log.info('Checking for installed addons');

    const promises = [];
    const needsSyncProfileUpdate = new Set();
    const installedGames = getInstalledGames();
    installedGames.forEach((gameId) => {
      const gameS = getGameSettings(gameId.toString());
      Object.entries(gameS).forEach(([gameVersion]) => {
        promises.push(_findAddonsForGameVersion(gameId, gameVersion, gameS[gameVersion].sync));
      });
    });
    Promise.allSettled(promises)
      .then((results) => {
        const toUpdate = [];
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            result.value.toUpdate.forEach((addon) => {
              if (addon.sync) {
                needsSyncProfileUpdate.add({
                  gameId: addon.gameId,
                  gameVersion: addon.gameVersion,
                });
              }
              autoUpdateAddonsLeft.push(addon);
              toUpdate.push(addon);
            });
          }
        });
        const autoUpdatePool = new PromisePool(_autoUpdateAddonProducer, 1);
        return autoUpdatePool.start()
          .then(() => {
            log.info('Finished updating addons');
            const win = getMainBrowserWindow();
            if (win) {
              win.webContents.send('addon-autoupdate-complete');
            }
            return resolve(needsSyncProfileUpdate);
          });
      })
      .catch((e) => {
        log.error(e);
        return reject(new Error('Error while identifying addons and checking for updates'));
      });
  });
}

function autoFindGame(gameId) {
  return new Promise((resolve, reject) => {
    let installFound = false;
    let platform;
    if (process.platform === 'win32') {
      platform = 'win';
    } else if (process.platform === 'darwin') {
      platform = 'mac';
    } else {
      platform = 'linux';
    }
    const {
      gameVersions,
      addonDir,
      likelyInstallPaths,
      settingsDir,
      addonDirLocation,
      settingsDirLocation,
    } = getGameData(gameId.toString());
    const promises = [];
    Object.entries(gameVersions).forEach(([gameVersion]) => {
      const { gameDir } = gameVersions[gameVersion];
      likelyInstallPaths[platform].forEach((dir) => {
        promises.push(_checkForGameVersion({
          selectedPath: dir,
          gameId,
          gameVersion,
          gameDir,
          addonDir,
          settingsDir,
          addonDirLocation,
          settingsDirLocation,
        }));
      });
    });
    Promise.allSettled(promises)
      .then((results) => {
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.installed) {
            installFound = true;
          }
        });
        return resolve(installFound);
      })
      .catch((e) => {
        log.error(e);
        reject(e);
      });
  });
}

function updateESOAddonPath(selectedPath) {
  return new Promise((resolve) => {
    const gameS = getGameSettings('2');
    const gameD = getGameData('2');
    gameS.eso.addonPath = selectedPath;
    gameS.eso.settingsPath = path.join(gameS.eso.addonPath, '..', path.sep, '..', path.sep, '..', path.sep, gameD.settingsDir);
    setGameSettings('2', gameS);
    return resolve();
  });
}

function findInstalledGame(gameId, selectedPath) {
  return new Promise((resolve, reject) => {
    const {
      gameVersions, addonDir, settingsDir, addonDirLocation, settingsDirLocation,
    } = getGameData(gameId.toString());
    const promises = [];
    Object.entries(gameVersions).forEach(([gameVersion]) => {
      const { gameDir } = gameVersions[gameVersion];
      promises.push(_checkForGameVersion({
        gameId,
        gameVersion,
        gameDir,
        selectedPath,
        addonDir,
        settingsDir,
        addonDirLocation,
        settingsDirLocation,
      }));
    });
    Promise.allSettled(promises)
      .then((results) => {
        const installedVersions = [];
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.installed) {
            installedVersions.push(result.value.gameVersion);
          }
        });
        return resolve(installedVersions);
      })
      .catch((e) => {
        log.error(e);
        return reject(e);
      });
  });
}

function _getAddonSubDirectories(gameAddonPath, currentDepth, maxDepth, parentDir, currentDir) {
  return new Promise((resolve, reject) => {
    fs.promises.readdir(path.join(gameAddonPath, parentDir, currentDir), { withFileTypes: true })
      .then((entries) => entries.filter((d) => d.isDirectory())
        .map((e) => path.join(currentDir, e.name)))
      .then((entries) => {
        let subDirectories = [];
        entries.forEach((entry) => {
          subDirectories.push(path.join(parentDir, entry));
        });
        if (currentDepth < maxDepth) {
          const promises = [];
          entries.forEach((entry) => {
            promises.push(_getAddonSubDirectories(
              gameAddonPath,
              currentDepth + 1,
              maxDepth,
              parentDir,
              entry,
            ));
          });
          return Promise.allSettled(promises)
            .then((results) => {
              results.forEach((result) => {
                if (result.status === 'fulfilled') {
                  subDirectories = subDirectories.concat(result.value.directories);
                }
              });
              return resolve({
                addonDir: parentDir,
                directories: subDirectories,
              });
            })
            .catch((recursionError) => reject(recursionError));
        }
        return resolve({
          addonDir: parentDir,
          directories: subDirectories,
        });
      });
  });
}

function _getDirectoriesToFingerprint(gameAddonPath, maxDepth) {
  return new Promise((resolve, reject) => {
    fs.promises.readdir(gameAddonPath, { withFileTypes: true })
      .then((entries) => entries.filter((d) => d.isDirectory())
        .map((e) => e.name))
      .then((entries) => {
        const directories = [];
        if (entries) {
          entries.forEach((entry) => {
            directories.push({
              addonDir: entry,
              directories: [
                entry,
              ],
            });
          });
        }
        if (maxDepth === 1) {
          return resolve(directories);
        }
        const promises = [];
        if (entries) {
          entries.forEach((entry) => {
            promises.push(_getAddonSubDirectories(gameAddonPath, 1, maxDepth, entry, ''));
          });
        }
        return Promise.allSettled(promises)
          .then((results) => {
            if (results) {
              results.forEach((result) => {
                if (result.status === 'fulfilled') {
                  const index = directories
                    .findIndex((obj) => obj.addonDir === result.value.addonDir);
                  directories[index].directories = directories[index].directories
                    .concat(result.value.directories);
                }
              });
            }
            return resolve(directories);
          })
          .catch((error) => reject(error));
      })
      .catch((error) => reject(error));
  });
}

async function fingerprintAllAsync(gameId, addonDir, fingerprintDepth) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(addonDir)) {
      log.info('Addon directory does not exists');
      return resolve({});
    }
    return _getDirectoriesToFingerprint(addonDir, fingerprintDepth)
      .then((addonFolders) => {
        const promises = [];
        const { manifestFile } = getGameData(gameId.toString());
        addonFolders.forEach((dir) => {
          if (dir.directories) {
            dir.directories.forEach((d) => {
              promises.push(_fingerprintAddonDir(manifestFile, addonDir, d));
            });
          }
        });
        Promise.allSettled(promises)
          .then((results) => {
            const addonHashMap = {};
            if (results) {
              results.forEach((result) => {
                if (result.status === 'fulfilled') {
                  addonHashMap[result.value.d.split(path.sep)
                    .join(path.posix.sep)] = result.value.hash;
                }
              });
            }
            resolve(addonHashMap);
          })
          .catch((e) => {
            log.error(e);
            reject(e);
          });
      })
      .catch((err) => {
        log.error(err);
        reject(err);
      });
  });
}

function getAddonDir(gameId, gameVersion) {
  const gameS = getGameSettings(gameId.toString());
  const { addonPath } = gameS[gameVersion];
  return addonPath;
}

async function getLocalSyncProfile(gameId, gameVersion) {
  return getLocalAddonSyncProfile(gameId, gameVersion);
}

async function getSyncProfilesFromCloud(enabled = []) {
  return new Promise((resolve, reject) => {
    if (isAuthenticated()) {
      log.info('Fetching cloud sync profiles');
      syncing = true;
      const axiosConfig = {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'User-Agent': `Singularity-${app.getVersion()}`,
          'x-auth': getAccessToken(),
        },
      };
      axios.get('https://api.singularitymods.com/api/v1/user/sync/get?all=true', axiosConfig)
        .then((res) => {
          if (res.status === 200 && res.data.success) {
            log.info('Addon sync profiles found');
            syncing = false;
            resolve({
              enabled,
              profiles: res.data.profiles,
            });
          } else {
            log.info('No addon sync profiles found');
            syncing = false;
            reject(new Error('No addon sync profile found in the cloud'));
          }
        })
        .catch((err) => {
          log.error('Error fetching addon sync profiles');
          log.error(err);
          syncing = false;
          reject(new Error('Error fetching addon sync profiles from the cloud'));
        });
    } else {
      log.info('User is not authenticated, skipping addon sync profile search');
      syncing = false;
      resolve('User is not authenticated, skipping addon sync profile search');
    }
  });
}

function handleSync() {
  return new Promise((resolve, reject) => {
    log.info('Starting addon sync process');
    syncing = true;
    _isSyncEnabled()
      .then((enabled) => getSyncProfilesFromCloud(enabled))
      .then((obj) => {
        if (obj.enabled) {
          obj.enabled.forEach((e) => {
            const enabledProfile = obj.profiles.find((p) => (
              p.gameId === e.gameId && p.gameVersion === e.gameVersion
            ));
            if (!enabledProfile) {
              syncProfilesToCreate.push({ gameId: e.gameId, gameVersion: e.gameVersion });
            } else {
              snycProfilesToProcess.push(enabledProfile);
            }
          });
        }
        const pool = new PromisePool(_handleSyncProfileProducer, 1);
        return pool.start();
      })
      .then(() => {
        const pool2 = new PromisePool(_createSyncProfileProducer, 3);
        return pool2.start();
      })
      .then(() => {
        syncing = false;
        resolve();
      })
      .catch((err) => {
        syncing = false;
        if (err.message === 'Sync is not enabled on any games or game versions') {
          log.info(err.message);
          resolve();
        }
        reject(err);
      });
  });
}

// For a given game ID and version, take in an object containing directories
// and fingerprints and attempt to identify the installed addons via the api
function identifyAddons(gameId, gameVersion, hashMap) {
  return new Promise((resolve, reject) => {
    const directories = [];
    Object.entries(hashMap).forEach(([folder, hash]) => {
      directories.push({
        folderName: folder,
        fingerprint: hash,
      });
    });
    log.info(`Submitting addon identification request for ${gameVersion}`);
    getAddonsFromFingerprints(directories)
      .then((addons) => {
        const win = getMainBrowserWindow();
        return handleFingerprintResponse(gameId, gameVersion, addons, hashMap, win);
      })
      .then((result) => resolve(result))
      .catch((error) => {
        log.error(error.message);
        return reject(error);
      });
  });
}

function installAddon(addonDir, downloadUrl) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(addonDir)) {
      try {
        fs.mkdirSync(addonDir, { recursive: true });
      } catch (err) {
        log.error(err);
        reject(new Error('Addon Directory Does Not Exist'));
      }
    }
    const tempDir = path.join(app.getPath('temp'), '/singularity');
    const win = getMainBrowserWindow();
    download(win, downloadUrl, { directory: tempDir, saveAs: false })
      .then((dItem) => {
        const savePath = dItem.getSavePath();
        extract(savePath, { dir: addonDir })
          .then(() => {
            if (fs.existsSync(savePath)) {
              fs.unlink(savePath, (err) => {
                if (err) {
                  log.error(err);
                  reject(err);
                }
                resolve();
              });
            } else {
              resolve();
            }
          })
          .catch((err) => {
            log.error(err);
            reject(new Error('Error extracting addon update'));
          });
      })
      .catch((err) => {
        log.error(err);
        reject(new Error('Error downloading adddon update'));
      });
  });
}

function handleUninstallDependencies(gameId, gameVersion, addon) {
  return new Promise((resolve, reject) => {
    if (!addon.installedFile.dependencies
      || addon.installedFile.dependencies.length === 0
    ) {
      log.info('No dependencies');
      return resolve(addon);
    }
    const toRemove = removeDependencies(gameId, gameVersion, addon);
    if (toRemove.length === 0) {
      log.info('No dependencies in need of removal');
      return resolve(addon);
    }
    if (gameId !== 2) {
      return resolve(addon);
    }
    if (!getUninstallDepsSetting(gameId, gameVersion)) {
      log.info('Dependency management disabled');
      return resolve(addon);
    }
    toRemove.forEach((dep) => {
      dependenciesToRemove.push(dep);
    });
    const pool = new PromisePool(() => _UninstallDependencyProducer(gameId, gameVersion), 1);
    return pool.start()
      .then(() => resolve(addon))
      .catch((error) => reject(error));
  });
}

function handleInstallDependencies(gameId, gameVersion, installedAddon) {
  return new Promise((resolve, reject) => {
    if (!installedAddon.installedFile.dependencies
      || installedAddon.installedFile.dependencies.length === 0
    ) {
      log.info('No dependencies');
      return resolve(installedAddon);
    }
    const newDeps = addDependencies(gameId, gameVersion, installedAddon);
    if (newDeps.length === 0) {
      log.info('No new dependencies');
      return resolve(installedAddon);
    }
    if (gameId !== 2) {
      return resolve(installedAddon);
    }
    if (!getInstallDepsSetting(gameId, gameVersion)) {
      log.info('Dependency management disabled');
      return resolve(installedAddon);
    }
    log.info(`Installing dependencies for ${installedAddon.addonName}`);
    newDeps.forEach((dep) => {
      dependenciesToInstall.push(dep);
    });
    const pool = new PromisePool(() => _installDependencyProducer(gameId, gameVersion), 1);
    return pool.start()
      .then(() => resolve(installedAddon))
      .catch((error) => reject(error));
  });
}

function isSearchingForProfiles() {
  return syncing;
}

function restoreGranularBackup(backup, includeSettings) {
  return new Promise((resolve, reject) => {
    const {
      addons,
      cloud,
      file,
      gameId,
      gameVersion,
      settings,
    } = backup;
    const gameS = getGameSettings(gameId.toString());
    const { settingsPath } = gameS[gameVersion];

    if (gameS[gameVersion].sync) {
      log.info('Addon sync is enabled, disabling before restoring backup');
      gameS[gameVersion].sync = false;
      setGameSettings(gameId.toString(), gameS);
    }

    if (!fs.existsSync(settingsPath)) {
      reject(new Error("Settings directory doesn't exist"));
    }

    const tempDir = path.join(app.getPath('temp'), '/singularity');
    const win = getMainBrowserWindow();

    if (win) {
      win.webContents.send('restore-status', 'Restoring Addons');
    }

    cloudAddonsToRestore = [];
    addons.forEach((a) => {
      const cloudAddon = a;
      cloudAddon.gameVersion = gameVersion;
      cloudAddonsToRestore.push(cloudAddon);
    });

    const pool = new PromisePool(() => _restorePromiseProducer(gameId, gameVersion), 1);
    pool.start()
      .then(() => {
        log.info('All addons restored');
        if (!includeSettings) {
          log.info('User did not opt to restore settings');
          return resolve('success');
        }
        if (cloud) {
          if (win) {
            win.webContents.send('restore-status', 'Downloading Settings Backup');
          }
          log.info('Downloading settings from the cloud');
          return download(win, settings, { directory: tempDir, saveAs: false })
            .then((dItem) => {
              log.info('Settings file downloaded');
              const savePath = dItem.getSavePath();
              extract(savePath, { dir: settingsPath })
                .then(() => {
                  log.info('Settings file extracted');
                  if (fs.existsSync(savePath)) {
                    fsPromises.unlink(savePath);
                  }
                });
            });
        }
        if (win) {
          win.webContents.send('restore-status', 'Unpacking Local Settings Backup');
        }
        log.info('Grabbing settings file from backup');
        const tmpFilePath = path.join(tempDir, 'tempsettings.zip');
        return fsPromises.writeFile(tmpFilePath, file, 'base64')
          .then(() => extract(tmpFilePath, { dir: settingsPath })
            .then(() => {
              log.info('Settings file extracted');
              if (fs.existsSync(tmpFilePath)) {
                fsPromises.unlink(tmpFilePath);
              }
            }));
      })
      .then(() => {
        log.info('Done restoring backup!');
        return resolve('success');
      })
      .catch((err) => {
        log.error(err);
        reject(new Error('Error restoring backup'));
      });
  });
}

// Check for and install addons at the user-configured interval.
// Default to every hour.
function setAddonUpdateInterval() {
  const appD = getAppData('userConfigurable');
  let checkInterval = 1000 * 60 * 60;
  if (appD.addonUpdateInterval) {
    switch (appD.addonUpdateInterval) {
      case '15m':
        checkInterval = 1000 * 60 * 15;
        break;
      case '30m':
        checkInterval = 1000 * 60 * 30;
        break;
      case '1h':
        checkInterval = 1000 * 60 * 60;
        break;
      case '3h':
        checkInterval = 1000 * 60 * 60 * 3;
        break;
      case 'never':
        checkInterval = null;
        break;
      default:
        checkInterval = 1000 * 60 * 60;
    }
  } else {
    appD.addonUpdateInterval = '1h';
    setAppData('userConfigurable', appD);
    checkInterval = 1000 * 60 * 60;
  }
  log.info(`Addon update interval set to: ${appD.addonUpdateInterval}`);
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  if (checkInterval) {
    updateInterval = setInterval(() => {
      // checkAddons();
      log.info('Starting addon auto refresh and update');
      findAndUpdateAddons()
        .then((profiles) => {
          updateSyncProfiles([...profiles])
            .then(() => {
              log.info('All sync profiles updated');
            })
            .catch((syncError) => {
              log.error('Error updating sync profiles');
              log.error(syncError);
            });
        })
        .catch((updateError) => {
          log.error('Error while auto-udpating addons');
          log.error(updateError);
        });
    }, checkInterval);
  }
}

function syncFromProfile(profile) {
  return new Promise((resolve, reject) => {
    const {
      addons,
      gameId,
      gameVersion,
    } = profile;
    log.info(`Handling sync for ${gameVersion}`);
    const gameS = getGameSettings(gameId.toString());
    const { installedAddons } = gameS[gameVersion];

    const win = getMainBrowserWindow();
    if (win) {
      win.webContents.send('sync-status', gameId, gameVersion, 'sync-started', null, null);
    }

    installedAddons.forEach((addon) => {
      const profileMatch = addons.find((a) => a.addonId === addon.addonId);
      if (!profileMatch && !addon.unknownUpdate && !addon.brokenInstallation) {
        const addonToRemove = addon;
        addonToRemove.gameId = gameId;
        addonToRemove.gameVersion = gameVersion;
        log.info(`Addon ${addonToRemove.addonName} not in sync profile, add to remove list`);
        syncedAddonsToRemove.push(addonToRemove);
      } else if (
        addon.installedFile.fileId !== profileMatch.fileId
          && addon.installedFile._id !== profileMatch.fileId
      ) {
        log.info(`Addon ${addon.addonName} needs to be updated from profile, add to list`);
        profileMatch.gameVersion = gameVersion;
        profileMatch.gameId = gameId;
        syncedAddonsToInstall.push(profileMatch);
      }
    });
    addons.forEach((addon) => {
      const match = installedAddons.find((a) => a.addonId === addon.addonId);
      if (!match) {
        const toAdd = addon;
        log.info(`Addon ${addon.addonName} needs to be installed from profile, add to list`);
        toAdd.gameVersion = gameVersion;
        toAdd.gameId = gameId;
        syncedAddonsToInstall.push(toAdd);
      }
    });
    if (win) {
      win.webContents.send('sync-status', gameId, gameVersion, 'handling-addons', null, null);
    }
    const pool = new PromisePool(_installAddonFromSyncProducer, 1);
    pool.start()
      .then(() => {
        log.info('All addons updated/installed from sync profile');
        log.info('Removing addons that do not exist in the sync profile');
        if (win) {
          win.webContents.send('sync-status', gameId, gameVersion, 'deleting-unsynced-addons', null, null);
        }
        const removePool = new PromisePool(
          () => _uninstallAddonFromSyncProducer(gameId, gameVersion), 3,
        );
        return removePool.start();
      })
      .then(() => {
        log.info('Done syncing from profile!');
        if (win) {
          win.webContents.send('sync-status', gameId, gameVersion, 'complete', new Date(), null);
        }
        return resolve('success');
      })
      .catch((err) => {
        log.error(err);
        reject(new Error('Error syncing from profile'));
        if (win) {
          win.webContents.send('sync-status', gameId, gameVersion, 'error', new Date(), 'Error syncing addons');
        }
      });
  });
}

function uninstallAddon(addonDir, addon) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(addonDir)) {
      reject(new Error('Addon Directory Does Not Exist'));
    }

    const promises = [];
    addon.installedFile.directories.forEach((m) => {
      if ((m.folderName.split(path.sep).length - 1) === 0) {
        promises.push(_uninstallDir(addonDir, m.folderName));
      }
    });
    Promise.allSettled(promises)
      .then(() => {
        resolve('success');
      })
      .catch((e) => {
        log.error(e);
      });
  });
}

function updateSyncProfiles(profiles) {
  return new Promise((resolve, reject) => {
    log.info('Updating sync profiles');
    if (!syncing) {
      profiles.forEach((profile) => {
        syncProfilesToCreate.push(profile);
      });
      const win = getMainBrowserWindow();
      const pool = new PromisePool(_createSyncProfileProducer, 3);
      return pool.start()
        .then(() => {
          syncing = false;
          if (win) {
            profiles.forEach((profile) => {
              win.webContents.send('sync-status', profile.gameId, profile.gameVersion, 'sync-complete', null, null);
            });
          }
          log.info('Finished updating sync profiles');
          return resolve();
        })
        .catch((err) => {
          syncing = false;
          if (win) {
            profiles.forEach((profile) => {
              win.webContents.send('sync-status', profile.gameId, profile.gameVersion, 'error', null, 'Error in sync after auto-updating');
            });
          }
          return reject(err);
        });
    }
    return reject(new Error('Already syncing'));
  });
}

/*
 * Private helper functions
 */
function _autoUpdateAddon(updateObj) {
  return new Promise((resolve, reject) => {
    const {
      addon, gameId, gameVersion, latestFile,
    } = updateObj;
    const gameS = getGameSettings(gameId.toString());
    const { addonPath } = gameS[gameVersion];

    log.info(`Updating addon ${addon.addonName}`);
    getAddonDownloadUrl(addon.addonId, latestFile.fileId)
      .then((fileInfo) => installAddon(addonPath, fileInfo.downloadUrl)
        .then(() => fileInfo)
        .catch((err) => {
          log.error(err.message);
          return Promise.reject(err);
        }))
      .then((fileInfo) => updateInstalledAddonInfo(
        gameId, gameVersion, addon, fileInfo.fileDetails,
      ))
      .then((installedAddon) => handleInstallDependencies(gameId, gameVersion, installedAddon))
      .then((installedAddon) => {
        if (gameS[gameVersion].sync && isAuthenticated()) {
          log.info('Game version is configured to sync, updating profile');
          return createAndSaveSyncProfile({ gameId, gameVersion })
            .then(() => {
              log.info('Sync profile updated');
              return resolve(installedAddon);
            })
            .catch((err) => {
              log.error('Error saving sync profile');
              log.error(err);
              return resolve(installedAddon);
            });
        }
        log.info(`Succesfully installed ${installedAddon.addonName}`);
        return resolve(installedAddon);
      })
      .catch((error) => {
        log.error(error.message);
        return reject(error);
      });
  });
}

function _checkDirforGame(dir) {
  return new Promise((resolve, reject) => {
    fsPromises.access(dir, fs.constants.F_OK)
      .then(() => {
        resolve(dir);
      })
      .catch((e) => reject(e));
  });
}

function _checkForGameVersion(gameObj) {
  const {
    selectedPath,
    gameId,
    gameVersion,
    gameDir,
    addonDir,
    addonDirLocation,
    settingsDir,
    settingsDirLocation,
  } = gameObj;
  let platform;
  if (process.platform === 'win32') {
    platform = 'win';
  } else if (process.platform === 'darwin') {
    platform = 'mac';
  } else {
    platform = 'linux';
  }
  let checkPath = selectedPath;
  if (selectedPath.includes('%USERDATA%')) {
    checkPath = path.join(app.getPath('userData'), '../', selectedPath.substring(11));
  }
  return new Promise((resolve, reject) => {
    const possibleLocations = [];
    gameDir[platform].forEach((directory) => {
      possibleLocations.push(path.join(checkPath, directory));
      possibleLocations.push(path.join(checkPath, '../', directory));
      possibleLocations.push(path.join(checkPath, '../../', directory));
      possibleLocations.push(path.join(checkPath, '../../../', directory));
      possibleLocations.push(path.join(checkPath, '../../../../', directory));
    });
    let installDir = null;
    const promises = [];
    possibleLocations.forEach((location) => {
      promises.push(_checkDirforGame(location));
    });
    Promise.allSettled(promises)
      .then((results) => {
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            installDir = path.dirname(result.value);
          }
        });
        if (installDir) {
          const gameS = getGameSettings(gameId.toString());
          gameS[gameVersion].installed = true;
          gameS[gameVersion].installPath = installDir;
          if (addonDirLocation[platform] === '%GAMEDIR%') {
            gameS[gameVersion].addonPath = path.join(installDir, addonDir);
          } else if (addonDirLocation[platform] === '%DOCUMENTS%') {
            const docDir = app.getPath('documents');
            gameS[gameVersion].addonPath = path.join(docDir, addonDir);
          }
          if (settingsDirLocation[platform] === '%GAMEDIR%') {
            gameS[gameVersion].settingsPath = path.join(installDir, settingsDir);
          } else if (settingsDirLocation[platform] === '%DOCUMENTS%') {
            const docDir = app.getPath('documents');
            gameS[gameVersion].settingsPath = path.join(docDir, settingsDir);
          }
          setGameSettings(gameId.toString(), gameS);
        }
        return resolve({
          gameVersion,
          installed: !!installDir,
        });
      })
      .catch((e) => {
        log.error(e);
        reject(e);
      });
  });
}

function _findAddonsForGameVersion(gameId, gameVersion, sync) {
  return new Promise((resolve, reject) => {
    log.info(`Finding addons for ${gameVersion}`);
    const gameS = getGameSettings(gameId.toString());
    const { fingerprintDepth, gameVersions } = getGameData(gameId.toString());
    const { addonVersion } = gameVersions[gameVersion];
    fingerprintAllAsync(gameId, gameS[gameVersion].addonPath, fingerprintDepth)
      .then((hashMap) => identifyAddons(gameId.toString(), gameVersion, hashMap))
      .then((result) => {
        log.info('Checking for addons that are configured to auto update');
        const toUpdate = [];
        if (result.addons.length > 0) {
          result.addons.forEach((addon) => {
            if (addon.updateAvailable && addon.autoUpdate && !addon.ignoreUpdate) {
              const possibleFiles = addon.latestFiles.filter((file) => (
                file.releaseType <= addon.trackBranch && file.gameVersionFlavor === addonVersion
              ));
              if (possibleFiles && possibleFiles.length > 0) {
                const latestFile = possibleFiles.reduce((a, b) => (
                  a.fileDate > b.fileDate ? a : b
                ));
                if (latestFile.fileDate > addon.installedFile.fileDate) {
                  toUpdate.push({
                    gameId, gameVersion, sync, addon, latestFile,
                  });
                }
              }
            }
          });
        }
        return resolve({ toUpdate });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function _installAddonFromSync(addon) {
  return new Promise((resolve, reject) => {
    const {
      addonId, addonName, fileId, gameId, gameVersion,
    } = addon;
    log.info(`Installing addon from sync profile: ${addonName}`);
    const win = getMainBrowserWindow();
    if (win) {
      win.webContents.send('sync-status', gameId, gameVersion, `Syncing: ${addonName}`);
    }
    const addonDir = getAddonDir(gameId, gameVersion);
    return getAddonInfo(addonId)
      .then((addonInfo) => getAddonDownloadUrl(addonId, fileId)
        .then((fileInfo) => installAddon(addonDir, fileInfo.downloadUrl)
          .then(() => fileInfo)
          .catch((err) => Promise.reject(err)))
        .then((fileInfo) => updateInstalledAddonInfo(
          gameId, gameVersion, addonInfo, fileInfo.fileDetails,
        ))
        .then(() => resolve())
        .catch((installErr) => Promise.reject(installErr)))
      .catch((error) => {
        log.error(error.message);
        return reject(error);
      });
  });
}

function _installDependency(gameId, gameVersion, dependency) {
  log.info(`Installing dependency ${dependency.name}`);
  return new Promise((resolve, reject) => {
    const addonDir = getAddonDir(gameId, gameVersion);
    return getAddonInfo(dependency.addonId)
      .then((addonInfo) => getAddonDownloadUrl(dependency.addonId, null)
        .then((fileInfo) => installAddon(addonDir, fileInfo.downloadUrl)
          .then(() => fileInfo)
          .catch((err) => {
            log.error(err.message);
            return reject(err);
          }))
        .then((fileInfo) => {
          let author = '';
          if (addonInfo.author) {
            author = addonInfo.author;
          } else if (addonInfo.authors) {
            const [firstAuthor] = addonInfo.authors;
            author = firstAuthor;
          } else if (addonInfo.curseAuthors) {
            const [firstAuthor] = addonInfo.curseAuthors;
            author = firstAuthor.name;
          } else if (addonInfo.tukuiAuthor) {
            author = addonInfo.tukuiAuthor;
          } else if (addonInfo.wowIntAuthor) {
            author = addonInfo.wowIntAuthor;
          } else if (addonInfo.mmouiAuthor) {
            author = addonInfo.mmouiAuthor;
          }
          const addon = {
            addonName: addonInfo.addonName,
            addonId: addonInfo.addonId,
            avatar: addonInfo.avatar,
            author,
            primaryCategory: addonInfo.primaryCategory,
            latestFiles: addonInfo.latestFiles,
          };
          return updateInstalledAddonInfo(gameId, gameVersion, addon, fileInfo.fileDetails);
        })
        .then((installedAddon) => updateDependencyInfo(
          gameId,
          gameVersion,
          dependency.name,
          installedAddon,
        ))
        .then((installedAddon) => {
          if (!installedAddon.installedFile.dependencies
            || installedAddon.installedFile.dependencies.length === 0
          ) {
            return resolve(installedAddon);
          }
          const newDeps = addDependencies(gameId, gameVersion, installedAddon);
          if (newDeps.length === 0) {
            return resolve(installedAddon);
          }
          newDeps.forEach((dep) => {
            dependenciesToInstall.push(dep);
          });
          return resolve(installedAddon);
        })
        .catch((error) => reject(error)));
  });
}

function _uninstallDependency(gameId, gameVersion, dependency) {
  log.info(`Uninstalling dependency ${dependency.name}`);
  return new Promise((resolve, reject) => {
    const gameS = getGameSettings(gameId.toString());
    const { addonPath, installedAddons } = gameS[gameVersion];
    const addon = installedAddons.find((obj) => obj.addonId === dependency.addonId);
    if (!addon) {
      return resolve();
    }
    return uninstallAddon(addonPath, addon)
      .then(() => removeInstalledAddonInfo(gameId, gameVersion, addon.addonId))
      .then(() => {
        const toRemove = removeDependencies(gameId, gameVersion, addon);
        if (toRemove.length === 0) {
          return resolve(addon);
        }
        toRemove.forEach((dep) => {
          dependenciesToRemove.push(dep);
        });
        return resolve(addon);
      })
      .catch((error) => reject(error));
  });
}

function _isSyncEnabled() {
  return new Promise((resolve, reject) => {
    const gameS = getGameSettings('1');
    const esoS = getGameSettings('2');
    const enabled = [];
    Object.entries(gameS).forEach(([key, gameVersion]) => {
      if (gameVersion.sync) {
        enabled.push({
          gameId: 1,
          gameVersion: key,
        });
      }
    });
    Object.entries(esoS).forEach(([key, gameVersion]) => {
      if (gameVersion.sync) {
        enabled.push({
          gameId: 2,
          gameVersion: key,
        });
      }
    });
    if (enabled.length > 0) {
      return resolve(enabled);
    }
    return reject(new Error('Sync is not enabled on any games or game versions'));
  });
}

function _fingerprintAddonDir(manifestFileExt, p, d) {
  return new Promise((resolve, reject) => {
    let tocFile;
    const addonFileHashes = [];
    let addonPath = '';
    try {
      addonPath = path.join(p, d);
    } catch (err) {
      reject(err);
    }
    fs.promises.readdir(addonPath)
      .then((addonFiles) => {
        for (let i = 0; i < addonFiles.length; i += 1) {
          const fileName = addonFiles[i];
          const filePath = path.join(addonPath, fileName);

          if (filePath.indexOf(manifestFileExt) >= 0) {
            if (addonPath.includes(fileName.slice(0, -4))) {
              tocFile = filePath;
              addonFileHashes.push(hasha.fromFileSync(tocFile, { algorithm: 'md5' }));
              break;
            }
          }
        }
        return fs.readFileSync(tocFile).toString('utf-8').split('\n');
      })
      .then((tocFileText) => {
        tocFileText.forEach((line) => {
          let lineContents = line;
          if (lineContents.trim().charAt(0) !== '#' && lineContents.trim().length > 0) {
            if (process.platform === 'darwin') {
              lineContents = lineContents.replace(/\\/g, '/');
            }
            const potentialFile = path.join(addonPath, lineContents.trim());
            if (fs.existsSync(potentialFile)) {
              try {
                addonFileHashes.push(hasha.fromFileSync(potentialFile, { algorithm: 'md5' }));
              } catch (err) {
                log.error(err.message);
              }
            }
          }
        });
        const hash = hasha(addonFileHashes.join(''), { algorithm: 'md5' });
        resolve({ d, hash });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function _restoreAddonFile(gameId, gameVersion, addon) {
  return new Promise((resolve, reject) => {
    const {
      addonId,
      addonName,
      fileId,
    } = addon;
    log.info(`Restoring addon backup for ${addonName}`);
    const win = getMainBrowserWindow();
    if (win) {
      win.webContents.send('restore-status', `Restoring: ${addonName}`);
    }
    const addonDir = getAddonDir(gameId, gameVersion);
    return getAddonInfo(addonId)
      .then((addonInfo) => getAddonDownloadUrl(addonId, fileId)
        .then((fileInfo) => installAddon(addonDir, fileInfo.downloadUrl)
          .then(() => fileInfo)
          .catch((err) => Promise.reject(err)))
        .then((fileInfo) => updateInstalledAddonInfo(
          gameId, gameVersion, addonInfo, fileInfo.fileDetails,
        ))
        .then(() => resolve())
        .catch((installErr) => Promise.reject(installErr)))
      .catch((error) => {
        log.error(error.message);
        return reject(error);
      });
  });
}

function _uninstallAddonFromSync(gameId, gameVersion, addon) {
  return new Promise((resolve, reject) => {
    log.info(`Uninstalling addon: ${addon.addonName}`);
    const gameS = getGameSettings(gameId.toString());
    const { addonPath } = gameS[gameVersion];

    if (!fs.existsSync(addonPath)) {
      reject(new Error('Addon Directory Does Not Exist'));
    }

    const promises = [];
    addon.installedFile.directories.forEach((m) => {
      if ((m.folderName.split(path.sep).length - 1) === 0) {
        promises.push(_uninstallDir(addonPath, m.folderName));
      }
    });
    Promise.allSettled(promises)
      .then(() => {
        log.info(`Sucessfully uninstalled addon: ${addon.addonName}`);
        return resolve('success');
      })
      .catch((e) => {
        log.error(e);
        return reject(e);
      });
  });
}

function _uninstallDir(p, d) {
  return new Promise((resolve, reject) => {
    if (d !== '/' && d !== '\\') {
      const directory = path.join(p, d);
      if (fs.existsSync(directory)) {
        return fsPromises.rmdir(directory, { recursive: true })
          .then(() => resolve())
          .catch((err) => reject(err));
      }
      return resolve();
    }
    return resolve();
  });
}

/*
 * Producer functions
 */
function _autoUpdateAddonProducer() {
  if (autoUpdateAddonsLeft.length > 0) {
    return _autoUpdateAddon(autoUpdateAddonsLeft.pop());
  }
  return null;
}

function _createSyncProfileProducer() {
  if (syncProfilesToCreate.length > 0) {
    return createAndSaveSyncProfile(syncProfilesToCreate.pop());
  }
  return null;
}

function _handleSyncProfileProducer() {
  if (snycProfilesToProcess.length > 0) {
    return syncFromProfile(snycProfilesToProcess.pop());
  }
  return null;
}

function _installAddonFromSyncProducer() {
  if (syncedAddonsToInstall.length > 0) {
    return _installAddonFromSync(syncedAddonsToInstall.pop());
  }
  return null;
}

function _restorePromiseProducer(gameId, gameVersion) {
  if (cloudAddonsToRestore.length > 0) {
    return _restoreAddonFile(gameId, gameVersion, cloudAddonsToRestore.pop());
  }
  return null;
}

function _uninstallAddonFromSyncProducer(gameId, gameVersion) {
  if (syncedAddonsToRemove.length > 0) {
    return _uninstallAddonFromSync(gameId, gameVersion, syncedAddonsToRemove.pop());
  }
  return null;
}

function _installDependencyProducer(gameId, gameVersion) {
  if (dependenciesToInstall.length > 0) {
    return _installDependency(gameId, gameVersion, dependenciesToInstall.pop());
  }
  return null;
}

function _UninstallDependencyProducer(gameId, gameVersion) {
  if (dependenciesToRemove.length > 0) {
    return _uninstallDependency(gameId, gameVersion, dependenciesToRemove.pop());
  }
  return null;
}

setInterval(() => {
  if (!syncing) {
    handleSync()
      .then(() => {
        log.info('Done with sync');
      })
      .catch((e) => {
        log.error(e.message);
      });
  } else {
    log.info('Already searching for sync profile updates, skipping this run');
  }
}, 1000 * 60 * 1);

export {
  autoFindGame,
  createAndSaveSyncProfile,
  createGranularBackupObj,
  createSyncProfileObj,
  deleteLocalBackup,
  findAndUpdateAddons,
  findInstalledGame,
  fingerprintAllAsync,
  getAddonDir,
  getLocalSyncProfile,
  getSyncProfilesFromCloud,
  handleInstallDependencies,
  handleUninstallDependencies,
  handleSync,
  identifyAddons,
  installAddon,
  isSearchingForProfiles,
  restoreGranularBackup,
  setAddonUpdateInterval,
  syncFromProfile,
  uninstallAddon,
  updateESOAddonPath,
  updateSyncProfiles,
};
