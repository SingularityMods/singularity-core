import { app, net } from 'electron';
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
import AppConfig from '../config/app.config';
import getMainBrowserWindow from './electron.service';

import {
  isAuthenticated,
  getAccessToken,

} from './auth.service';
import {
  getGameSettings,
  getAppData,
  getGameData,
  setGameSettings,
  setAppData,
  deleteBackupInfo,
  getLocalAddonSyncProfile,
} from './storage.service';

let syncing = false;
let error = null;

const snycProfilesToProcess = [];
const syncProfilesToCreate = [];

ncp.limit = 16;

const autoUpdateAddonsLeft = [];
let cloudAddonsToRestore = [];

const syncedAddonsToInstall = [];
const syncedAddonsToRemove = [];

let updateInterval;

function backupAddons(gameId, gameVersion, addonDir, backupDir) {
  return new Promise((resolve, reject) => {
    if (gameId === 1) {
      // World of Warcraft

      if (!fs.existsSync(addonDir)) {
        reject(new Error("Addon directory duesn't exist"));
      }
      const destinationPath = path.join(backupDir, 'backup', gameId.toString(), gameVersion);

      if (!fs.existsSync(destinationPath)) {
        try {
          fs.mkdirSync(destinationPath, { recursive: true });
        } catch (err) {
          reject(new Error('Unable to create backup directory'));
        }
      }

      const dstFile = path.join(destinationPath, 'addons.zip');

      if (fs.existsSync(dstFile)) {
        fs.unlink(dstFile, (err) => {
          if (err) {
            log.error(err);
            reject(err);
          }
          const output = fs.createWriteStream(dstFile);
          const archive = archiver('zip', {
            zlib: { level: 9 },
          });
          output.on('close', () => {
            log.info('Addon Backup Complete');
            resolve({});
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

          archive.pipe(output);
          log.info('Addon Backup Started');
          archive.directory(addonDir, false);
          archive.finalize();
        });
      } else {
        const output = fs.createWriteStream(dstFile);
        const archive = archiver('zip', {
          zlib: { level: 9 },
        });
        output.on('close', () => {
          log.info('Addon Backup Complete');
          resolve({});
        });

        archive.on('warning', (err) => {
          if (err.code === 'ENOENT') {
            log.error(err);
          } else {
            // throw error
            log.error(err);
            reject(err);
          }
        });

        archive.on('error', (err) => {
          log.error(err);
          reject(new Error('Error compressing backup'));
        });

        archive.pipe(output);
        log.info('Addon Backup Started');
        archive.directory(addonDir, false);
        archive.finalize();
      }
    } else {
      reject(new Error('Unknown game ID'));
    }
  });
}

function backupAddonSettings(gameId, gameVersion, settingsDir, backupDir) {
  return new Promise((resolve, reject) => {
    if (gameId === 1) {
      // World of Warcraft

      if (!fs.existsSync(settingsDir)) {
        reject(new Error("Settings directory doesn't exist"));
      }
      const destinationPath = path.join(backupDir, 'backup', gameId.toString(), gameVersion);

      if (!fs.existsSync(destinationPath)) {
        try {
          fs.mkdirSync(destinationPath, { recursive: true });
        } catch (err) {
          reject(new Error('Unable to create backup directory'));
        }
      }
      const output = fs.createWriteStream(`${destinationPath}/settings.zip`);
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });
      output.on('close', () => {
        resolve({});
      });

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          log.error(err);
        } else {
          // throw error
          log.error(err);
          reject(err);
        }
      });

      archive.on('error', (err) => {
        log.error(err);
        reject(err);
      });

      archive.pipe(output);

      archive.directory(settingsDir, false);
      archive.finalize();
    } else {
      reject(new Error('Unknown game ID'));
    }
  });
}

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
    const { installPath } = gameS[gameVersion];
    const settingsPath = path.join(installPath, 'WTF');
    const { installedAddons } = gameS[gameVersion];
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
    const gameId = 1;
    const gameS = getGameSettings(gameId.toString());
    const promises = [];
    const gameVersions = [];
    const needsSyncProfileUpdate = new Set();

    Object.entries(gameS).forEach(([gameVersion]) => {
      gameVersions.push(gameVersion);
      promises.push(_findAddonsForGameVersion(gameId, gameVersion));
    });
    Promise.allSettled(promises)
      .then((results) => {
        const toUpdate = [];
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            result.value.toUpdate.forEach((addon) => {
              if (gameS[addon.gameVersion].sync) {
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

// For the sepected path, attempt to find any installed WoW versions in either the path root
// or for each game version directory
function findInstalledWoWVersions(selectedPath) {
  const { gameVersions } = getGameData('1');
  const installedVersions = [];
  Object.entries(gameVersions).forEach(([gameVersion]) => {
    if (process.platform === 'win32') {
      const exePath = path.join(selectedPath, gameVersions[gameVersion].executable);
      const { flavorString } = gameVersions[gameVersion];

      if (fs.existsSync(exePath)) {
        // Identify version
        const flavorFile = path.join(selectedPath, '.flavor.info');
        if (fs.existsSync(flavorFile)) {
          const text = fs.readFileSync(flavorFile).toString('utf-8').split('\n');
          if (text[1] === flavorString) {
            installedVersions.push(gameVersion);
          }
        }
      } else {
        let p = '';
        let f = '';
        switch (gameVersion) {
          case 'wow_retail':
            p = path.join(selectedPath, '_retail_', gameVersions[gameVersion].executable);
            f = path.join(selectedPath, '_retail_', '.flavor.info');
            break;
          case 'wow_classic':
            p = path.join(selectedPath, '_classic_', gameVersions[gameVersion].executable);
            f = path.join(selectedPath, '_classic_', '.flavor.info');
            break;
          case 'wow_retail_ptr':
            p = path.join(selectedPath, '_ptr_', gameVersions[gameVersion].executable);
            f = path.join(selectedPath, '_ptr_', '.flavor.info');
            break;
          case 'wow_classic_ptr':
            p = path.join(selectedPath, '_classic_ptr_', gameVersions[gameVersion].executable);
            f = path.join(selectedPath, '_classic_ptr_', '.flavor.info');
            break;
          case 'wow_retail_beta':
            p = path.join(selectedPath, '_beta_', gameVersions[gameVersion].executable);
            f = path.join(selectedPath, '_beta_', '.flavor.info');
            break;
          case 'wow_classic_beta':
            p = path.join(selectedPath, '_classic_beta_', gameVersions[gameVersion].executable);
            f = path.join(selectedPath, '_classic_beta_', '.flavor.info');
            break;
          default:
            p = path.join(selectedPath, '_retail_', gameVersions[gameVersion].executable);
            f = path.join(selectedPath, '_retail_', '.flavor.info');
            break;
        }
        if (fs.existsSync(p)) {
          if (fs.existsSync(f)) {
            const text = fs.readFileSync(f).toString('utf-8').split('\n');
            if (text[1] === flavorString) {
              installedVersions.push(gameVersion);
            }
          }
        }
      }
    } else if (process.platform === 'darwin') {
      const exePath = path.join(selectedPath, gameVersions[gameVersion].macExecutable);
      if (fs.existsSync(exePath)) {
        if (exePath.includes(gameVersions[gameVersion].macFlavorString)) {
          installedVersions.push(gameVersion);
        }
      } else {
        let p = '';
        switch (gameVersion) {
          case 'wow_retail':
            p = path.join(selectedPath, '_retail_', gameVersions[gameVersion].macExecutable);
            break;
          case 'wow_classic':
            p = path.join(selectedPath, '_classic_', gameVersions[gameVersion].macExecutable);
            break;
          case 'wow_retail_ptr':
            p = path.join(selectedPath, '_ptr_', gameVersions[gameVersion].macExecutable);
            break;
          case 'wow_classic_ptr':
            p = path.join(selectedPath, '_classic_ptr_', gameVersions[gameVersion].macExecutable);
            break;
          case 'wow_retail_beta':
            p = path.join(selectedPath, '_beta_', gameVersions[gameVersion].macExecutable);
            break;
          case 'wow_classic_beat':
            p = path.join(selectedPath, '_classic_beta_', gameVersions[gameVersion].macExecutable);
            break;
          default:
            p = path.join(selectedPath, '_retail_', gameVersions[gameVersion].macExecutable);
            break;
        }
        if (fs.existsSync(p)) {
          installedVersions.push(gameVersion);
        }
      }
    }
  });
  return installedVersions;
}

function fingerprintAllAsync(gameId, installDir, addonDir) {
  return new Promise((resolve, reject) => {
    if (gameId === 1) {
      // World of Warcraft
      const p = path.join(installDir, addonDir);
      if (!fs.existsSync(p)) {
        resolve({});
      } else {
        fs.promises.readdir(p, { withFileTypes: true })
          .then((files) => files.filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)).then((addonDirs) => {
            const promises = [];
            addonDirs.forEach((dir) => {
              promises.push(_readAddonDir(p, dir));
            });
            Promise.allSettled(promises)
              .then((results) => {
                const addonHashMap = {};
                results.forEach((result) => {
                  if (result.status === 'fulfilled') {
                    addonHashMap[result.value.d] = result.value.hash;
                  }
                });
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
      }
    }
  });
}

function getAddonDir(gameId, gameVersion) {
  const gameS = getGameSettings(gameId.toString());
  const { gameVersions } = getGameData(gameId.toString());
  let addonDir;
  if (process.platform === 'win32') {
    addonDir = path.join(gameS[gameVersion].installPath,
      gameVersions[gameVersion].addonDir);
  } else if (process.platform === 'darwin') {
    addonDir = path.join(gameS[gameVersion].installPath,
      gameVersions[gameVersion].macAddonDir);
  }
  return addonDir;
}

async function getLocalSyncProfile(gameId, gameVersion) {
  return getLocalAddonSyncProfile(gameId, gameVersion);
}

function getSyncError() {
  return error;
}

async function getSyncProfilesFromCloud(enabled = []) {
  return new Promise((resolve, reject) => {
    if (isAuthenticated()) {
      log.info('Fetching cloud sync profiles');
      syncing = true;
      error = null;
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
          error = 'Error fetching sync profile from cloud';
          reject(new Error('Error fetching addon sync profiles from the cloud'));
        });
    } else {
      log.info('User is not authenticated, skipping addon sync profile search');
      syncing = false;
      error = "Not authenticated, can't retrieve profile";
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
        error = null;
        resolve();
      })
      .catch((err) => {
        syncing = false;
        if (err.message === 'Sync is not enabled on any games or game versions') {
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
    const gameS = getGameSettings(gameId.toString());
    const { gameVersions } = getGameData(gameId.toString());
    const { addonVersion } = gameVersions[gameVersion];
    const win = getMainBrowserWindow();
    const hashes = [];
    Object.entries(hashMap).forEach(([, hash]) => {
      hashes.push(hash);
    });
    log.info(`Submitting addon identification request for ${gameVersion}`);
    const postData = JSON.stringify({ fingerprints: hashes });
    const request = net.request({
      method: 'POST',
      url: `${AppConfig.API_URL}/addons/fingerprint`,
    });
    request.setHeader('x-app-uuid', getAppData('UUID'));
    request.setHeader('x-app-platform', process.platform);
    let body = '';
    request.on('error', (requestErr) => {
      log.error(`Error while identifying addons for ${gameVersion}`);
      log.error(requestErr);
      if (win) {
        win.webContents.send('no-addons-found', gameVersion);
      }
      reject(new Error(`Error identifying addons for ${gameVersion}`));
    });
    request.on('response', (response) => {
      if (response.statusCode === 404) {
        log.info(`Received 404 response when identifying addons for for ${gameVersion}`);
        const currentlyInstalledAddons = gameS[gameVersion].installedAddons;
        const identifiedAddons = [];
        const unknownDirs = [];
        const identifiedDirs = [];
        Object.entries(hashMap).forEach(([, hash]) => {
          if (!identifiedDirs.includes(hash)) {
            unknownDirs.push(hash);
          }
        });

        if (unknownDirs.length > 0) {
          currentlyInstalledAddons.forEach((addon) => {
            const addonDirs = [];
            addon.modules.forEach((module) => {
              addonDirs.push(module.folderName);
            });
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

        gameS[gameVersion].installedAddons = identifiedAddons;
        gameS[gameVersion].unknownAddonDirs = unknownDirs;
        setGameSettings(gameId.toString(), gameS);
        if (win) {
          win.webContents.send('no-addons-found', gameVersion);
        }
        resolve({ gameId, gameVersion, addons: identifiedAddons });
      } else {
        response.on('data', (chunk) => {
          body += chunk.toString();
        });
        response.on('end', () => {
          if (body) {
            log.info(`Received data in response when identifying addons for for ${gameVersion}`);
            const addons = JSON.parse(body);
            const currentlyInstalledAddons = gameS[gameVersion].installedAddons;

            const identifiedAddons = [];
            const unknownDirs = [];
            const identifiedDirs = [];

            if (addons && addons.length > 0) {
              log.info(`At least one addon identified for ${gameVersion}`);
              addons.forEach((addon) => {
                const identifiedAddon = addon;
                const installedVersion = currentlyInstalledAddons.find((a) => (
                  a.addonId === identifiedAddon.addonId
                ));
                if (installedVersion) {
                  identifiedAddon.trackBranch = installedVersion.trackBranch
                    || gameS[gameVersion].defaults.trackBranch;
                  identifiedAddon.autoUpdate = installedVersion.autoUpdate
                    || gameS[gameVersion].defaults.autoUpdate;
                  identifiedAddon.ignoreUpdate = installedVersion.ignoreUpdate || false;
                } else {
                  identifiedAddon.trackBranch = gameS[gameVersion].defaults.trackBranch;
                  identifiedAddon.autoUpdate = gameS[gameVersion].defaults.autoUpdate;
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
                if (identifiedAddon.modules && identifiedAddon.modules.length > 0) {
                  identifiedAddon.modules.forEach((module) => {
                    identifiedDirs.push(module.folderName);
                  });
                }
              });
              Object.entries(hashMap).forEach(([, hash]) => {
                if (!identifiedDirs.includes(hash)) {
                  unknownDirs.push(hash);
                }
              });

              if (unknownDirs.length > 0) {
                currentlyInstalledAddons.forEach((addon) => {
                  const addonDirs = [];
                  addon.modules.forEach((module) => {
                    addonDirs.push(module.folderName);
                  });
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

              gameS[gameVersion].installedAddons = identifiedAddons;
              gameS[gameVersion].unknownAddonDirs = unknownDirs;
              setGameSettings(gameId.toString(), gameS);
              log.info(`${gameVersion} - ${identifiedAddons.length} addons installed & ${unknownDirs.length} directories unknown`);
              if (win) {
                win.webContents.send('addons-found', identifiedAddons, gameVersion);
              }
              resolve({ gameId, gameVersion, addons: identifiedAddons });
            } else {
              log.info(`No addon identified for ${gameVersion}`);
              Object.entries(hashMap).forEach(([, hash]) => {
                if (!identifiedDirs.includes(hash)) {
                  unknownDirs.push(hash);
                }
              });

              if (unknownDirs.length > 0) {
                currentlyInstalledAddons.forEach((addon) => {
                  const addonDirs = [];
                  addon.modules.forEach((module) => {
                    addonDirs.push(module.folderName);
                  });
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

              gameS[gameVersion].installedAddons = identifiedAddons;
              gameS[gameVersion].unknownAddonDirs = unknownDirs;
              setGameSettings(gameId.toString(), gameS);
              log.info(`${gameVersion} - ${identifiedAddons.length} addons installed & ${unknownDirs.length} directories unknown`);
              if (win) {
                win.webContents.send('no-addons-found', gameVersion);
              }
              resolve({ gameId, gameVersion, addons: identifiedAddons });
            }
          } else {
            log.info(`Received no data in response when identifying addons for for ${gameVersion}`);
            const currentlyInstalledAddons = gameS[gameVersion].installedAddons;
            const identifiedAddons = [];
            const unknownDirs = [];
            const identifiedDirs = [];

            Object.entries(hashMap).forEach(([, hash]) => {
              if (!identifiedDirs.includes(hash)) {
                unknownDirs.push(hash);
              }
            });

            if (unknownDirs.length > 0) {
              currentlyInstalledAddons.forEach((addon) => {
                const addonDirs = [];
                addon.modules.forEach((module) => {
                  addonDirs.push(module.folderName);
                });
                if (addonDirs.every((v) => unknownDirs.includes(v))) {
                  const identifiedAddon = addon;
                  identifiedAddon.unknownUpdate = true;
                  if (!identifiedAddons.some((e) => e.addonId === identifiedAddon.addonId)) {
                    log.info(`Unkown update installed for addon ${identifiedAddon.addonName}`);
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

            gameS[gameVersion].installedAddons = identifiedAddons;
            gameS[gameVersion].unknownAddonDirs = unknownDirs;
            setGameSettings(gameId.toString(), gameS);
            log.info(`${gameVersion} - ${identifiedAddons.length} addons installed & ${unknownDirs.length} directories unknown`);
            if (win) {
              win.webContents.send('no-addons-found', gameVersion);
            }
            resolve({ gameId, gameVersion, addons: identifiedAddons });
          }
        });
      }
    });
    request.write(postData);
    request.end();
  });
}

function installAddon(gameId, addonDir, addon) {
  return new Promise((resolve, reject) => {
    if (gameId === 1) {
      // World of Warcraft
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
      download(win, addon.downloadUrl, { directory: tempDir })
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
                  resolve('success');
                });
              } else {
                resolve('success');
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
    }
  });
}

function isSearchingForProfiles() {
  return syncing;
}

function restoreAddons(gameId, gameVersion, addonDir, backupDir) {
  return new Promise((resolve, reject) => {
    if (gameId === 1) {
      // World of Warcraft

      if (!fs.existsSync(addonDir)) {
        reject(new Error("Addon directory doesn't exist"));
      }
      const backupPath = path.join(backupDir, 'backup', gameId.toString(), gameVersion, 'addons.zip');

      if (!fs.existsSync(backupPath)) {
        reject(new Error("Addon backup directory doesn't exist"));
      }

      extract(backupPath, { dir: addonDir })
        .then(() => {
          resolve({});
        }).catch((err) => {
          reject(err);
        });
    } else {
      reject(new Error('Unknown game ID'));
    }
  });
}

function restoreAddonSettings(gameId, gameVersion, settingsDir, backupDir) {
  return new Promise((resolve, reject) => {
    if (gameId === 1) {
      // World of Warcraft

      if (!fs.existsSync(settingsDir)) {
        reject(new Error("Settings directory doesn't exist"));
      }
      const backupPath = path.join(backupDir, 'backup', gameId.toString(), gameVersion, 'settings.zip');

      if (!fs.existsSync(backupPath)) {
        reject(new Error("Settings backup doesn't exist"));
      }

      extract(backupPath, { dir: settingsDir })
        .then(() => {
          resolve({});
        }).catch((err) => {
          reject(err);
        });
    } else {
      reject(new Error('Unknown game ID'));
    }
  });
}

function restoreGranularBackup(backup, includeSettings) {
  return new Promise((resolve, reject) => {
    const gameS = getGameSettings(backup.gameId.toString());
    const { installPath } = gameS[backup.gameVersion];
    const settingsPath = path.join(installPath, 'WTF');

    if (gameS[backup.gameVersion].sync) {
      log.info('Addon sync is enabled, disabling before restoring backup');
      gameS[backup.gameVersion].sync = false;
      setGameSettings(backup.gameId.toString(), gameS);
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
    backup.addons.forEach((a) => {
      const cloudAddon = a;
      cloudAddon.gameVersion = backup.gameVersion;
      cloudAddonsToRestore.push(cloudAddon);
    });

    const pool = new PromisePool(_restorePromiseProducer, 1);
    pool.start()
      .then(() => {
        log.info('All addons restored');
        if (!includeSettings) {
          log.info('User did not opt to restore settings');
          return resolve('success');
        }
        if (backup.cloud) {
          if (win) {
            win.webContents.send('restore-status', 'Downloading Settings Backup');
          }
          log.info('Downloading settings from the cloud');
          return download(win, backup.settings, { directory: tempDir })
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
        return fsPromises.writeFile(tmpFilePath, backup.file, 'base64')
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
        checkInterval = 1000 * 60 * 60 * 24 * 365;
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

function syncFromProfile(profile) {
  return new Promise((resolve, reject) => {
    log.info(`Handling sync for ${profile.gameVersion}`);
    const gameS = getGameSettings(profile.gameId.toString());
    const { installedAddons } = gameS[profile.gameVersion];

    const win = getMainBrowserWindow();
    if (win) {
      win.webContents.send('sync-status', profile.gameId, profile.gameVersion, 'sync-started', null, null);
    }

    installedAddons.forEach((addon) => {
      const profileMatch = profile.addons.find((a) => a.addonId === addon.addonId);
      if (!profileMatch && !addon.unknownUpdate && !addon.brokenInstallation) {
        const addonToRemove = addon;
        addonToRemove.gameId = profile.gameId;
        addonToRemove.gameVersion = profile.gameVersion;
        log.info(`Addon ${addonToRemove.addonName} not in sync profile, add to remove list`);
        syncedAddonsToRemove.push(addonToRemove);
      } else if (addon.installedFile.fileId !== profileMatch.fileId) {
        log.info(`Addon ${addon.addonName} needs to be updated from profile, add to list`);
        profileMatch.gameVersion = profile.gameVersion;
        profileMatch.gameId = profile.gameId;
        syncedAddonsToInstall.push(profileMatch);
      }
    });
    if (win) {
      win.webContents.send('sync-status', profile.gameId, profile.gameVersion, 'handling-addons', null, null);
    }
    const pool = new PromisePool(_installAddonFromSyncProducer, 1);
    pool.start()
      .then(() => {
        log.info('All addons updated/installed from sync profile');
        log.info('Removing addons that do not exist in the sync profile');
        if (win) {
          win.webContents.send('sync-status', profile.gameId, profile.gameVersion, 'deleting-unsynced-addons', null, null);
        }
        const removePool = new PromisePool(_uninstallAddonFromSyncProducer, 3);
        return removePool.start();
      })
      .then(() => {
        log.info('Done syncing from profile!');
        if (win) {
          win.webContents.send('sync-status', profile.gameId, profile.gameVersion, 'complete', new Date(), null);
        }
        return resolve('success');
      })
      .catch((err) => {
        log.error(err);
        reject(new Error('Error syncing from profile'));
        if (win) {
          win.webContents.send('sync-status', profile.gameId, profile.gameVersion, 'error', new Date(), 'Error syncing addons');
        }
      });
  });
}

function uninstallAddon(gameId, addonDir, addon) {
  return new Promise((resolve, reject) => {
    if (gameId === 1) {
      // World of Warcraft

      if (!fs.existsSync(addonDir)) {
        reject(new Error('Addon Directory Does Not Exist'));
      }

      const promises = [];
      addon.modules.forEach((m) => {
        promises.push(_uninstallDir(addonDir, m.folderName));
      });
      Promise.allSettled(promises)
        .then(() => {
          resolve('success');
        })
        .catch((e) => {
          log.error(e);
        });
    }
  });
}

function updateAddon(gameId, addonDir, addon, latestFile) {
  return new Promise((resolve, reject) => {
    if (gameId === 1) {
      // World of Warcraft

      if (!fs.existsSync(addonDir)) {
        try {
          fs.mkdirSync(addonDir, { recursive: true });
        } catch (err) {
          reject(new Error('Addon Directory Does Not Exist'));
        }
      }
      const tempDir = path.join(app.getPath('temp'), '/singularity');

      const win = getMainBrowserWindow();

      download(win, latestFile.downloadUrl, { directory: tempDir })
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
                  resolve('success');
                });
              } else {
                resolve('success');
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
    }
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
          error = 'Error in automatic sync';
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
    const gameS = getGameSettings(updateObj.gameId.toString());
    const { gameVersions } = getGameData(updateObj.gameId.toString());
    let addonDir = '';
    if (process.platform === 'win32') {
      addonDir = path.join(gameS[updateObj.gameVersion].installPath,
        gameVersions[updateObj.gameVersion].addonDir);
    } else if (process.platform === 'darwin') {
      addonDir = path.join(gameS[updateObj.gameVersion].installPath,
        gameVersions[updateObj.gameVersion].macAddonDir);
    }
    log.info(`Updating addon ${updateObj.addon.addonName}`);
    updateAddon(updateObj.gameId, addonDir, updateObj.addon, updateObj.latestFile)
      .then(() => {
        const { addon, gameVersion, latestFile } = updateObj;
        addon.fileName = latestFile.fileName;
        addon.fileDate = latestFile.fileDate;
        addon.releaseType = latestFile.releaseType;
        addon.modules = latestFile.modules;
        addon.installedFile = latestFile;
        addon.updateAvailable = false;
        addon.updateFile = {};
        addon.brokenInstallation = false;

        const installedAddons = gameS[gameVersion].installedAddons.filter((obj) => (
          obj.addonId !== updateObj.addon.addonId
        ));
        installedAddons.push(addon);
        gameS[updateObj.gameVersion].installedAddons = installedAddons;

        setGameSettings(updateObj.gameId.toString(), gameS);
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function _findAddonsForGameVersion(gameId, gameVersion) {
  return new Promise((resolve, reject) => {
    log.info(`Finding addons for ${gameVersion}`);
    const gameS = getGameSettings(gameId.toString());
    const { gameVersions } = getGameData(gameId.toString());
    const { addonVersion } = gameVersions[gameVersion];
    let addonDir = '';
    if (process.platform === 'win32') {
      addonDir = gameVersions[gameVersion].addonDir;
    } else if (process.platform === 'darwin') {
      addonDir = gameVersions[gameVersion].macAddonDir;
    }
    fingerprintAllAsync(gameId, gameS[gameVersion].installPath, addonDir)
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
                    gameId, gameVersion, addon, latestFile,
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
    log.info(`Installing addon from sync profile: ${addon.addonName}`);
    const win = getMainBrowserWindow();
    if (win) {
      win.webContents.send('sync-status', addon.gameId, addon.gameVersion, `Syncing: ${addon.addonName}`);
    }
    const gameS = getGameSettings(addon.gameId.toString());
    const { gameVersions } = getGameData(addon.gameId.toString());

    let addonDir = '';
    if (process.platform === 'win32') {
      addonDir = path.join(gameS[addon.gameVersion].installPath,
        gameVersions[addon.gameVersion].addonDir);
    } else if (process.platform === 'darwin') {
      addonDir = path.join(gameS[addon.gameVersion].installPath,
        gameVersions[addon.gameVersion].macAddonDir);
    }
    // World of Warcraft

    if (!fs.existsSync(addonDir)) {
      try {
        fs.mkdirSync(addonDir, { recursive: true });
      } catch (err) {
        reject(new Error('Addon Directory Does Not Exist'));
      }
    }
    const tempDir = path.join(app.getPath('temp'), '/singularity');

    download(win, addon.downloadUrl, { directory: tempDir })
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
                resolve('success');
              });
            } else {
              resolve('success');
            }
          })
          .catch((err) => {
            log.error(err);
            reject(new Error('Error extracting addon from addon sync'));
          });
      })
      .catch((err) => {
        log.error(err);
        reject(new Error('Error downloading adddon from addon sync'));
      });
  });
}

function _isSyncEnabled() {
  return new Promise((resolve, reject) => {
    const gameS = getGameSettings('1');
    const enabled = [];
    Object.entries(gameS).forEach(([gameVersion]) => {
      if (gameVersion.sync) {
        enabled.push({
          gameId: 1,
          gameVersion,
        });
      }
    });
    if (enabled.length > 0) {
      return resolve(enabled);
    }
    return reject(new Error('Sync is not enabled on any games or game versions'));
  });
}
function _readAddonDir(p, d) {
  return new Promise((resolve, reject) => {
    let tocFile;
    const addonFileHashes = [];
    let addonDir = '';
    try {
      addonDir = path.join(p, d);
    } catch (err) {
      reject(err);
    }
    fs.promises.readdir(addonDir)
      .then((addonFiles) => {
        for (let i = 0; i < addonFiles.length; i += 1) {
          const filename = path.join(addonDir, addonFiles[i]);

          if (filename.indexOf('.toc') >= 0) {
            tocFile = filename;
            addonFileHashes.push(hasha.fromFileSync(tocFile, { algorithm: 'md5' }));
            break;
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
            try {
              addonFileHashes.push(hasha.fromFileSync(path.join(addonDir, lineContents.trim()), { algorithm: 'md5' }));
            } catch (err) {
              log.error(err);
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

function _restoreWoWAddonFile(addon) {
  return new Promise((resolve, reject) => {
    log.info(`Restoring addon backup for ${addon.addonName}`);
    const win = getMainBrowserWindow();
    if (win) {
      win.webContents.send('restore-status', `Restoring: ${addon.addonName}`);
    }
    const gameS = getGameSettings('1');
    const { gameVersions } = getGameData('1');

    let addonDir = '';
    if (process.platform === 'win32') {
      addonDir = path.join(gameS[addon.gameVersion].installPath,
        gameVersions[addon.gameVersion].addonDir);
    } else if (process.platform === 'darwin') {
      addonDir = path.join(gameS[addon.gameVersion].installPath,
        gameVersions[addon.gameVersion].macAddonDir);
    }
    // World of Warcraft

    if (!fs.existsSync(addonDir)) {
      try {
        fs.mkdirSync(addonDir, { recursive: true });
      } catch (err) {
        reject(new Error('Addon Directory Does Not Exist'));
      }
    }
    const tempDir = path.join(app.getPath('temp'), '/singularity');

    download(win, addon.downloadUrl, { directory: tempDir })
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
                resolve('success');
              });
            } else {
              resolve('success');
            }
          })
          .catch((err) => {
            log.error(err);
            reject(new Error('Error extracting addon backup'));
          });
      })
      .catch((err) => {
        log.error(err);
        reject(new Error('Error extracting addon backup'));
      });
  });
}

function _uninstallAddonFromSync(addon) {
  return new Promise((resolve, reject) => {
    log.info(`Uninstalling addon: ${addon.addonName}`);
    const gameS = getGameSettings(addon.gameId.toString());
    const { gameVersions } = getGameData(addon.gameId.toString());

    let addonDir = '';
    if (process.platform === 'win32') {
      addonDir = path.join(gameS[addon.gameVersion].installPath,
        gameVersions[addon.gameVersion].addonDir);
    } else if (process.platform === 'darwin') {
      addonDir = path.join(gameS[addon.gameVersion].installPath,
        gameVersions[addon.gameVersion].macAddonDir);
    }

    if (!fs.existsSync(addonDir)) {
      reject(new Error('Addon Directory Does Not Exist'));
    }

    const promises = [];
    addon.modules.forEach((m) => {
      promises.push(_uninstallDir(addonDir, m.folderName));
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

function _restorePromiseProducer() {
  if (cloudAddonsToRestore.length > 0) {
    return _restoreWoWAddonFile(cloudAddonsToRestore.pop());
  }
  return null;
}

function _uninstallAddonFromSyncProducer() {
  if (syncedAddonsToRemove.length > 0) {
    return _uninstallAddonFromSync(syncedAddonsToRemove.pop());
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
}, 1000 * 60 * 5);

export {
  backupAddons,
  backupAddonSettings,
  createAndSaveSyncProfile,
  createGranularBackupObj,
  createSyncProfileObj,
  deleteLocalBackup,
  findAndUpdateAddons,
  findInstalledWoWVersions,
  fingerprintAllAsync,
  getAddonDir,
  getLocalSyncProfile,
  getSyncError,
  getSyncProfilesFromCloud,
  handleSync,
  identifyAddons,
  installAddon,
  isSearchingForProfiles,
  restoreAddons,
  restoreAddonSettings,
  restoreGranularBackup,
  setAddonUpdateInterval,
  syncFromProfile,
  uninstallAddon,
  updateAddon,
  updateSyncProfiles,
};
