import {
  app, ipcMain, net, shell,
} from 'electron';
import axios from 'axios';
import log from 'electron-log';
import path from 'path';

import AppConfig from '../../config/app.config';

import { getAccessToken, isAuthenticated } from '../../services/auth.service';
import {
  getAppData,
  getGameData,
  getGameSettings,
  setGameSettings,
} from '../../services/storage.service';
import {
  createAndSaveSyncProfile,
  fingerprintAllAsync,
  identifyAddons,
  installAddon,
  syncFromProfile,
  uninstallAddon,
  updateAddon,
} from '../../services/file.service';

ipcMain.on('addon-search', (event, gameId, gameVersion, searchFilter, categoryId, page, pageSize) => {
  const { gameVersions } = getGameData(gameId.toString());
  const { addonVersion } = gameVersions[gameVersion];
  const index = page * pageSize;
  const catId = categoryId || 0;

  const request = net.request(`${AppConfig.API_URL}/addons/search?gameId=${gameId}&gameVersionFlavor=${addonVersion}&filter=${searchFilter}&category=${catId}&index=${index}`);
  request.setHeader('x-app-uuid', getAppData('UUID'));
  let body = '';
  request.on('error', (error) => {
    event.sender.send('addon-search-error');
    log.error(error);
  });
  request.on('response', (response) => {
    response.on('data', (chunk) => {
      body += chunk.toString();
    });

    response.on('end', () => {
      if (body) {
        const addons = JSON.parse(body);
        if (page === 0) {
          event.sender.send('addon-search-result', addons);
        } else {
          event.sender.send('additional-addon-search-result', addons);
        }
      } else {
        event.sender.send('addon-search-no-result');
      }
    });
  });
  request.end();
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

ipcMain.on('find-addons-async', async (event, gameId, gameVersion) => {
  log.info('Called: find-addons');
  const gameS = getGameSettings(gameId.toString());
  if (gameS[gameVersion].sync) {
    event.sender.send('sync-status', gameId, gameVersion, 'sync-started', null, null);
  }
  const hashMap = await fingerprintAllAsync(gameId, gameS[gameVersion].addonPath);
  log.info(`Fingerprinted ${Object.keys(hashMap).length}directories for ${gameVersion}`);
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

ipcMain.on('get-addon-info', (event, addonId) => {
  const request = net.request(`${AppConfig.API_URL}/addon/${addonId}`);
  request.setHeader('x-app-uuid', getAppData('UUID'));
  let body = '';
  request.on('error', (error) => {
    log.error(error);
  });
  request.on('response', (response) => {
    response.on('data', (chunk) => {
      if (chunk) {
        body += chunk.toString();
      }
    });
    response.on('end', () => {
      if (body) {
        const addon = JSON.parse(body);
        event.sender.send('addon-info-result', addon);
      }
    });
  });
  request.end();
});

ipcMain.on('install-addon', async (event, gameId, gameVersionFlavor, addon, branch) => {
  const gameS = getGameSettings(gameId.toString());
  const { gameVersions } = getGameData(gameId.toString());
  const addonVersionFlavor = gameVersions[gameVersionFlavor].addonVersion;
  let installedFile = {};
  addon.latestFiles.forEach((file) => {
    if (file.gameVersionFlavor === addonVersionFlavor && file.releaseType === branch) {
      installedFile = file;
    }
  });
  installAddon(gameId, gameS[gameVersionFlavor].addonPath, installedFile)
    .then(() => {
      const trackBranch = addon.trackBranch || 1;
      const autoUpdate = addon.autoUpdate || false;
      const ignoreUpdate = addon.ignoreUpdate || false;

      let updateAvailable = false;
      let updateFile = addon.latestFiles.find((f) => (
        f.gameVersion === addonVersionFlavor
        && f.releaseType <= trackBranch
        && f.fileDate > installedFile.fileDate
      ));
      if (updateFile) {
        updateAvailable = true;
      } else {
        updateFile = {};
      }
      const installedAddon = {
        addonName: addon.addonName,
        addonId: addon.addonId,
        primaryCategory: addon.primaryCategory,
        author: addon.author,
        fileName: installedFile.fileName,
        fileDate: installedFile.fileDate,
        releaseType: installedFile.releaseType,
        gameVersion: installedFile.gameVersion[0],
        modules: installedFile.modules,
        latestFiles: addon.latestFiles,
        installedFile,
        updateAvailable,
        updateFile,
        brokenInstallation: false,
        unknownUpdate: false,
        trackBranch,
        autoUpdate,
        ignoreUpdate,

      };
      const installedAddons = gameS[gameVersionFlavor].installedAddons
        .filter((obj) => obj.addonId !== installedAddon.addonId);
      installedAddons.push(installedAddon);
      gameS[gameVersionFlavor].installedAddons = installedAddons;
      setGameSettings(gameId.toString(), gameS);
      event.sender.send('addon-installed', installedAddon);
      if (gameS[gameVersionFlavor].sync && isAuthenticated()) {
        log.info('Game version is configured to sync, updating profile');
        createAndSaveSyncProfile({ gameId, gameVersion: gameVersionFlavor })
          .then(() => {
            log.info('Sync profile updated');
          })
          .catch((err) => {
            log.error('Error saving sync profile');
            log.error(err);
          });
      }
    })
    .catch((err) => {
      log.error(err);
    });
});

ipcMain.on('install-addon-file', async (event, gameId, gameVersionFlavor, addon, fileId) => {
  const request = net.request(`${AppConfig.API_URL}/file/${fileId}`);
  request.setHeader('x-app-uuid', getAppData('UUID'));
  let body = '';
  request.on('error', (error) => {
    log.error(error);
  });
  request.on('response', (response) => {
    response.on('data', (chunk) => {
      body += chunk.toString();
    });

    response.on('end', () => {
      if (body) {
        const f = JSON.parse(body);
        const gameS = getGameSettings(gameId.toString());
        const { gameVersions } = getGameData(gameId.toString());
        const { addonVersion } = gameVersions[gameVersionFlavor];
        const installedFile = f;
        installAddon(gameId, gameS[gameVersionFlavor].addonPath, installedFile)
          .then(() => {
            let updateAvailable = false;
            let updateFile = {};
            const trackBranch = addon.trackBranch || 1;
            const autoUpdate = addon.autoUpdate || false;
            const ignoreUpdate = addon.ignoreUpdate || false;

            const possibleFiles = addon.latestFiles.filter((file) => (
              file.releaseType <= trackBranch && file.gameVersionFlavor === addonVersion
            ));
            if (possibleFiles && possibleFiles.length > 0) {
              const latestFile = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
              if (installedFile.fileDate < latestFile.fileDate) {
                updateAvailable = true;
                updateFile = latestFile;
              }
            }

            const installedAddon = {
              addonName: addon.addonName,
              addonId: addon.addonId,
              primaryCategory: addon.primaryCategory,
              author: addon.author,
              fileName: installedFile.fileName,
              fileDate: installedFile.fileDate,
              releaseType: installedFile.releaseType,
              gameVersion: installedFile.gameVersion[0],
              modules: installedFile.modules,
              latestFiles: addon.latestFiles,
              installedFile,
              updateAvailable,
              updateFile,
              brokenInstallation: false,
              unknownUpdate: false,
              trackBranch,
              autoUpdate,
              ignoreUpdate,
            };
            const installedAddons = gameS[gameVersionFlavor].installedAddons
              .filter((obj) => obj.addonId !== installedAddon.addonId);
            installedAddons.push(installedAddon);
            gameS[gameVersionFlavor].installedAddons = installedAddons;
            setGameSettings(gameId.toString(), gameS);
            event.sender.send('addon-installed', installedAddon);
            if (gameS[gameVersionFlavor].sync && isAuthenticated()) {
              log.info('Game version is configured to sync, updating profile');
              createAndSaveSyncProfile({ gameId, gameVersion: gameVersionFlavor })
                .then(() => {
                  log.info('Sync profile updated');
                })
                .catch((err) => {
                  log.error('Error saving sync profile');
                  log.error(err);
                });
            }
          })
          .catch((err) => {
            log.error(err);
          });
      }
    });
  });
  request.end();
});

ipcMain.on('open-addon-directory', (event, gameId, gameVersion, directory) => {
  const gameS = getGameSettings(gameId.toString());
  const addonDir = path.join(gameS[gameVersion].addonPath, directory);
  shell.openPath(addonDir);
});

ipcMain.on('uninstall-addon', async (event, gameId, gameVersion, addonId) => {
  const gameS = getGameSettings(gameId.toString());
  let { installedAddons } = gameS[gameVersion];
  const addon = installedAddons.find((a) => a.addonId === addonId);
  if (addon) {
    uninstallAddon(gameId, gameS[gameVersion].addonPath, addon)
      .then(() => {
        installedAddons = installedAddons.filter((obj) => obj.addonId !== addonId);
        gameS[gameVersion].installedAddons = installedAddons;
        setGameSettings(gameId.toString(), gameS);
        event.sender.send('addon-uninstalled', addonId);
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
      }).catch((err) => {
        event.sender.send('addon-uninstall-failed', addonId);
        log.error(err);
      });
  } else {
    event.sender.send('addon-uninstall-failed', addonId);
  }
});

ipcMain.on('update-addon', async (event, gameId, gameVersion, addon) => {
  log.info(`Updating addon: ${addon.addonName}`);
  const gameS = getGameSettings(gameId.toString());
  const { gameVersions } = getGameData(gameId.toString());
  const { addonVersion } = gameVersions[gameVersion];
  const possibleFiles = addon.latestFiles.filter((file) => (
    file.releaseType <= addon.trackBranch && file.gameVersionFlavor === addonVersion
  ));
  if (possibleFiles && possibleFiles.length > 0) {
    const latestFile = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
    updateAddon(gameId, gameS[gameVersion].addonPath, addon, latestFile)
      .then(() => {
        const installedAddon = addon;
        installedAddon.updateAvailable = false;
        installedAddon.updateFile = {};
        installedAddon.fileName = latestFile.fileName;
        installedAddon.fileDate = latestFile.fileDate;
        installedAddon.releaseType = latestFile.releaseType;
        installedAddon.installedFile = latestFile;
        installedAddon.modules = latestFile.modules;
        gameS[gameVersion].installedAddons.forEach((a) => {
          if (a.addonId === installedAddon.addonId) {
            gameS[gameVersion].installedAddons[a] = installedAddon;
          }
        });
        setGameSettings(gameId.toString(), gameS);
        event.sender.send('addon-installed', installedAddon);
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
  } else {
    log.info('No updates found');
  }
});
