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
  searchForAddons,
} from '../../services/singularity.service';

ipcMain.on('addon-search', async (event, gameId, gameVersion, searchFilter, categoryId, page, pageSize) => {
  searchForAddons(gameId, gameVersion, searchFilter, categoryId, page, pageSize)
    .then((addons) => {
      if (!addons) {
        return event.sender.send('addon-search-no-result');
      }
      if (page === 0) {
        return event.sender.send('addon-search-result', addons);
      }
      return event.sender.send('additional-addon-search-result', addons);
    })
    .catch((error) => {
      event.sender.send('addon-search-error');
      log.error(error.message);
    });
});

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
  log.info('Called: find-addons');
  const gameS = getGameSettings(gameId.toString());
  if (gameS[gameVersion].sync) {
    event.sender.send('sync-status', gameId, gameVersion, 'sync-started', null, null);
  }
  const hashMap = await fingerprintAllAsync(gameId, gameS[gameVersion].addonPath);
  log.info(`Fingerprinted ${Object.keys(hashMap).length} directories for ${gameVersion}`);
  identifyAddons(gameId.toString(), gameVersion, hashMap)
    .then(() => {
      if (gameS[gameVersion].sync && isAuthenticated()) {
        log.info('Sync enabled for game version');
        log.info('Fetching addon sync profile');
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
            event.sender.send('sync-status', gameId, gameVersion, 'sync-complete', new Date(), null);
          })
          .catch((err) => {
            log.error('Error handling addon sync');
            log.error(err);
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
      return Promise.resolve();
    })
    .catch((err) => {
      log.error(`Error attempting to identify addons for ${gameVersion} in find-addons`);
      log.error(err);
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

ipcMain.handle('install-addon', async (
  event, gameId, gameVersion, addon, fileId,
) => new Promise((resolve, reject) => {
  log.info(`Installing addon ${addon.addonName}`);
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
