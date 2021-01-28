import {
  app, ipcMain, shell,
} from 'electron';
import axios from 'axios';
import log from 'electron-log';
import path from 'path';

import AppConfig from '../../config/app.config';

import { getAccessToken, isAuthenticated } from '../../services/auth.service';
import {
  getAddonDir,
  getGameData,
  getGameSettings,
  setGameSettings,
  updateInstalledAddonInfo,
  removeInstalledAddonInfo,
  isGameVersionInstalled,
} from '../../services/storage.service';
import {
  createAndSaveSyncProfile,
  fingerprintAllAsync,
  handleInstallDependencies,
  handleUninstallDependencies,
  identifyAddons,
  installAddon,
  syncFromProfile,
  uninstallAddon,
} from '../../services/file.service';
import {
  getAddonDownloadUrl,
  getAddonInfo,
  getCluster,
  searchForAddons,
} from '../../services/singularity.service';

ipcMain.handle('search-for-addons', async (event, gameId, gameVersion, searchFilter, categoryId, page, pageSize, sort, sortOrder) => new Promise((resolve, reject) => {
  searchForAddons(gameId, gameVersion, searchFilter, categoryId, page, pageSize, sort, sortOrder)
    .then((addons) => resolve(addons))
    .catch((error) => {
      log.error(error.message);
      return reject(new Error('Error searching for addons'));
    });
}));

ipcMain.handle('get-cluster', (event, clusterId) => new Promise((resolve, reject) => {
  log.info(`Searching for cluster: ${clusterId}`);
  getCluster(clusterId)
    .then((cluster) => resolve(cluster))
    .catch((error) => {
      console.log(error);
      log.error(error.message);
      return reject(new Error('Error searching for cluster'));
    });
}));

ipcMain.on('change-addon-auto-update', (event, gameId, gameVersion, addonId, toggle) => {
  log.info(`Changing auto update settings for: ${addonId} to: ${toggle}`);

  const gameS = getGameSettings(gameId.toString());
  let { installedAddons } = gameS[gameVersion];

  const addon = installedAddons.find((a) => a.addonId === addonId);
  addon.autoUpdate = toggle;

  installedAddons = installedAddons.map((a) => (a.addonId === addonId
    ? addon
    : a));
  gameS[gameVersion].installedAddons = installedAddons;
  setGameSettings(gameId.toString(), gameS);
  event.sender.send('addon-settings-updated', addonId, addon);
  if (gameS[gameVersion].sync && isAuthenticated()) {
    log.info('Game version is configured to sync, updating profile');
    createAndSaveSyncProfile({ gameId, gameVersion })
      .then(() => {
        log.info('Sync profile updated');
      })
      .catch((err) => {
        log.error('Error saving sync profile');
        log.error(err);
      });
  }
});

ipcMain.on('change-addon-branch', (event, gameId, gameVersion, addonId, branch) => {
  log.info(`Changing release branch for: ${addonId} to: ${branch}`);
  const { gameVersions } = getGameData(gameId.toString());
  const gameS = getGameSettings(gameId.toString());
  const { addonVersion } = gameVersions[gameVersion];
  let { installedAddons } = gameS[gameVersion];
  const addon = installedAddons.find((a) => a.addonId === addonId);
  addon.trackBranch = branch;
  addon.updateAvailable = false;
  addon.updatefile = {};

  const possibleFiles = addon.latestFiles.filter((file) => (
    file.releaseType <= addon.trackBranch && file.gameVersionFlavor === addonVersion
  ));
  if (possibleFiles && possibleFiles.length > 0) {
    const latestFile = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
    if (addon.installedFile.fileDate < latestFile.fileDate) {
      addon.updateAvailable = true;
      addon.updatefile = latestFile;
    }
  }

  installedAddons = installedAddons.map((a) => (a.addonId === addonId
    ? addon
    : a));
  gameS[gameVersion].installedAddons = installedAddons;
  setGameSettings(gameId.toString(), gameS);
  event.sender.send('addon-settings-updated', addonId, addon);
  if (gameS[gameVersion].sync && isAuthenticated()) {
    log.info('Game version is configured to sync, updating profile');
    createAndSaveSyncProfile({ gameId, gameVersion })
      .then(() => {
        log.info('Sync profile updated');
      })
      .catch((err) => {
        log.error('Error saving sync profile');
        log.error(err);
      });
  }
});

ipcMain.on('change-addon-ignore-update', (event, gameId, gameVersion, addonId, toggle) => {
  log.info(`Changing ignore update settings for: ${addonId} to: ${toggle}`);

  const gameS = getGameSettings(gameId.toString());
  let { installedAddons } = gameS[gameVersion];

  const addon = installedAddons.find((a) => a.addonId === addonId);
  addon.ignoreUpdate = toggle;

  installedAddons = installedAddons.map((a) => (a.addonId === addonId
    ? addon
    : a));
  gameS[gameVersion].installedAddons = installedAddons;
  setGameSettings(gameId.toString(), gameS);
  event.sender.send('addon-settings-updated', addonId, addon);
});

ipcMain.handle('get-addons-dependent-on', async (event, gameId, gameVersion, addonId) => new Promise((resolve) => {
  const gameS = getGameSettings(gameId.toString());
  const { dependencies } = gameS[gameVersion];
  let dependencyFor;
  Object.entries(dependencies).forEach(([dependency]) => {
    if (dependencies[dependency].addonId === addonId) {
      dependencyFor = dependencies[dependency].dependencyFor;
    }
  });
  return resolve(dependencyFor);
}));

ipcMain.handle('get-installed-addons', async (event, gameId, gameVersion) => new Promise((resolve) => {
  const gameS = getGameSettings(gameId.toString());
  return resolve(gameS[gameVersion].installedAddons);
}));

ipcMain.on('find-addons-async', async (event, gameId, gameVersion) => {
  log.info('Identifying installed addons');
  event.sender.send('app-status-message', 'Identifying installed addons', 'status');
  const gameS = getGameSettings(gameId.toString());
  const gameD = getGameData(gameId.toString());
  if (gameS[gameVersion].sync) {
    event.sender.send('sync-status', gameId, gameVersion, 'sync-started', null, null);
  }
  fingerprintAllAsync(gameId, gameS[gameVersion].addonPath, gameD.fingerprintDepth)
    .then((hashMap) => {
      log.info(`Fingerprinted ${Object.keys(hashMap).length} directories for ${gameVersion}`);
      identifyAddons(gameId.toString(), gameVersion, hashMap)
        .then(() => {
          if (gameS[gameVersion].sync && isAuthenticated()) {
            log.info('Sync enabled for game version');
            log.info('Fetching addon sync profile');
            event.sender.send('app-status-message', 'Checking addon sync profile', 'status');
            const axiosConfig = {
              headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'User-Agent': `Singularity-${app.getVersion()}`,
                'x-auth': getAccessToken(),
              },
            };
            event.sender.send('sync-status', gameId, gameVersion, 'checking-cloud', null, null);
            return axios.get(`${AppConfig.API_URL}/user/sync/get?gameId=${gameId}&gameVersion=${gameVersion}`, axiosConfig)
              .then((res) => {
                if (res.status === 200 && res.data.success) {
                  log.info('Addon sync profile found');
                  return syncFromProfile(res.data.profile);
                } if (res.status === 200) {
                  log.info('No addon sync profile found');
                  return createAndSaveSyncProfile({ gameId, gameVersion });
                }
                return Promise.reject(new Error('Error searching for sync profile'));
              })
              .then(() => {
                log.info('Sync process complete');
                event.sender.send('app-status-message', 'Addon sync complete', 'success');
                event.sender.send('sync-status', gameId, gameVersion, 'sync-complete', new Date(), null);
              })
              .catch((err) => {
                log.error('Error handling addon sync');
                log.error(err);
                event.sender.send('app-status-message', 'Error syncing addons', 'error');
                if (err instanceof String) {
                  event.sender.send('sync-status', gameId, gameVersion, 'error', null, err);
                } else {
                  event.sender.send('sync-status', gameId, gameVersion, 'error', null, 'Error handling addon sync');
                }
              });
          }
          if (!isAuthenticated()) {
            log.info('User is not authenticated, nothing to sync');
            event.sender.send('sync-status', gameId, gameVersion, 'error', null, 'User not authenticated');
          }
          event.sender.send('app-status-message', 'Finished identifying addons', 'success');
          return Promise.resolve();
        })
        .catch((err) => {
          log.error(`Error attempting to identify addons for ${gameVersion} in find-addons`);
          log.error(err);
          event.sender.send('app-status-message', 'Error identifying addons', 'error');
        });
    })
    .catch((fingerprintErr) => {
      log.error(`Error attempting to identify addons for ${gameVersion} in find-addons`);
      log.error(fingerprintErr);
      event.sender.send('app-status-message', 'Error identifying addons', 'error');
    });
});

ipcMain.on('get-addon-info', async (event, addonId) => {
  getAddonInfo(addonId)
    .then((result) => {
      event.sender.send('addon-info-result', result);
    })
    .catch((error) => {
      log.error(error.message);
    });
});

ipcMain.handle('install-addon-from-cluster', async (event, gameId, gameVersion, addon, fileId) => new Promise((resolve, reject) => {
  if (isGameVersionInstalled(gameId, gameVersion)) {
    log.info(`Installing addon ${addon.name}`);
    event.sender.send('app-status-message', `Installing ${addon.name}`, 'status');
    const addonDir = getAddonDir(gameId, gameVersion);
    return getAddonInfo(addon._id)
      .then((addonInfo) => {
        getAddonDownloadUrl(addonInfo.addonId, fileId)
          .then((fileInfo) => installAddon(addonDir, fileInfo.downloadUrl)
            .then(() => fileInfo)
            .catch((err) => {
              log.error(err.message);
              return Promise.reject(err);
            }))
          .then((fileInfo) => updateInstalledAddonInfo(
            gameId, gameVersion, addonInfo, fileInfo.fileDetails,
          ))
          .then((installedAddon) => handleInstallDependencies(gameId, gameVersion, installedAddon))
          .then((installedAddon) => {
            const gameS = getGameSettings(gameId.toString());
            if (gameS[gameVersion].sync && isAuthenticated()) {
              log.info('Game version is configured to sync, updating profile');
              return createAndSaveSyncProfile({ gameId, gameVersion })
                .then(() => {
                  log.info('Sync profile updated');
                  event.sender.send('app-status-message', `Successfully installed ${installedAddon.addonName}`, 'success');
                  return resolve(installedAddon);
                })
                .catch((err) => {
                  log.error('Error saving sync profile');
                  log.error(err);
                  event.sender.send('app-status-message', `Successfully installed ${installedAddon.addonName}`, 'success');
                  return resolve(installedAddon);
                });
            }
            log.info(`Successfully installed ${installedAddon.addonName}`);
            event.sender.send('app-status-message', `Successfully installed ${installedAddon.addonName}`, 'success');
            return resolve(installedAddon);
          })
          .catch((error) => {
            log.error(error.message);
            event.sender.send('app-status-message', `Error installing ${addon.name}`, 'error');
            return reject(error);
          });
      });
  }
  return reject(new Error('Game version is not installed'));
}));

ipcMain.handle('install-addon', async (
  event, gameId, gameVersion, addon, fileId,
) => new Promise((resolve, reject) => {
  log.info(`Installing addon ${addon.addonName}`);
  event.sender.send('app-status-message', `Installing ${addon.addonName}`, 'status');
  const addonDir = getAddonDir(gameId, gameVersion);
  return getAddonDownloadUrl(addon.addonId, fileId)
    .then((fileInfo) => installAddon(addonDir, fileInfo.downloadUrl)
      .then(() => fileInfo)
      .catch((err) => {
        log.error(err.message);
        return Promise.reject(err);
      }))
    .then((fileInfo) => updateInstalledAddonInfo(gameId, gameVersion, addon, fileInfo.fileDetails))
    .then((installedAddon) => handleInstallDependencies(gameId, gameVersion, installedAddon))
    .then((installedAddon) => {
      const gameS = getGameSettings(gameId.toString());
      if (gameS[gameVersion].sync && isAuthenticated()) {
        log.info('Game version is configured to sync, updating profile');
        return createAndSaveSyncProfile({ gameId, gameVersion })
          .then(() => {
            log.info('Sync profile updated');
            event.sender.send('app-status-message', `Successfully installed ${installedAddon.addonName}`, 'success');
            return resolve(installedAddon);
          })
          .catch((err) => {
            log.error('Error saving sync profile');
            log.error(err);
            event.sender.send('app-status-message', `Successfully installed ${installedAddon.addonName}`, 'success');
            return resolve(installedAddon);
          });
      }
      log.info(`Successfully installed ${installedAddon.addonName}`);
      event.sender.send('app-status-message', `Successfully installed ${installedAddon.addonName}`, 'success');
      return resolve(installedAddon);
    })
    .catch((error) => {
      log.error(error.message);
      event.sender.send('app-status-message', `Error installing ${addon.addonName}`, 'error');
      return reject(error);
    });
}));

ipcMain.handle('uninstall-addon', async (event, gameId, gameVersion, addonId) => new Promise((resolve, reject) => {
  const gameS = getGameSettings(gameId.toString());
  const { installedAddons } = gameS[gameVersion];
  const addon = installedAddons.find((a) => a.addonId === addonId);
  log.info(`Uninstalling addon ${addon.addonName}`);
  if (addon) {
    return uninstallAddon(gameS[gameVersion].addonPath, addon)
      .then(() => removeInstalledAddonInfo(gameId, gameVersion, addonId))
      .then(() => handleUninstallDependencies(gameId, gameVersion, addon))
      .then(() => {
        event.sender.send('addon-uninstalled', addonId);
        if (gameS[gameVersion].sync && isAuthenticated()) {
          log.info('Game version is configured to sync, updating profile');
          return createAndSaveSyncProfile({ gameId, gameVersion });
        }
        return resolve(addonId);
      })
      .then(() => resolve(addonId))
      .catch((err) => {
        log.error(err);
        return reject(err);
      });
  }
  log.error("Tried uninstalling addon that Singularity didn't know was installed");
  return reject(new Error('Unable to find addon'));
}));

ipcMain.on('open-addon-directory', (event, gameId, gameVersion, directory) => {
  const gameS = getGameSettings(gameId.toString());
  const addonDir = path.join(gameS[gameVersion].addonPath, directory);
  shell.openPath(addonDir);
});
