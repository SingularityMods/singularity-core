import { ipcMain, dialog } from 'electron';
import log from 'electron-log';

import {
  autoFindGame, findAndUpdateAddons, findInstalledGame,
} from '../../services/file.service';
import {
  getGameData,
  getGameSettings,
  setGameSettings,
  getWago,
  setWago,
} from '../../services/storage.service';
import {
  checkGameVersionForWagoUpdates,
  uninstallCompanion,
} from '../../services/wago.service';

ipcMain.handle('get-games', () => {
  const wowD = getGameData('1');
  const esoD = getGameData('2');
  return [
    {
      gameId: 1,
      name: wowD.name,
      iconPath: wowD.iconPath,
      tilePath: wowD.tilePath,
    },
    {
      gameId: 2,
      name: esoD.name,
      iconPath: esoD.iconPath,
      tilePath: esoD.tilePath,
    },
  ];
});

ipcMain.on('auto-find-game', (event, gameId) => {
  autoFindGame(gameId)
    .then((installFound) => {
      if (installFound) {
        event.sender.send('installation-found');
        findAndUpdateAddons();
      } else {
        event.sender.send('installation-not-found', "We couldn't find the game. Try finding it manually?");
      }
    })
    .catch(() => {
      event.sender.send('installation-not-found', "We couldn't find the game. Try finding it manually?");
    });
});

ipcMain.on('manually-find-game', (event, gameId) => {
  dialog.showOpenDialog({
    properties: ['openDirectory'],
  }).then((result) => {
    if (!result.canceled && result.filePaths) {
      const [resultPath] = result.filePaths;
      findInstalledGame(gameId, resultPath)
        .then((installedVersions) => {
          if (installedVersions && installedVersions.length > 0) {
            event.sender.send('installation-found');
            findAndUpdateAddons();
          } else {
            event.sender.send('installation-not-found', "We couldn't find a valid game in that directory");
          }
        })
        .catch(() => {
          event.sender.send('installation-not-found', "We couldn't find a valid game in that directory");
        });
    }
  }).catch((err) => {
    log.error(err);
    event.sender.send('installation-not-found', "We couldn't find a valid game in that directory");
  });
});

ipcMain.on('set-game-defaults', (_event, gameId, gameVersion, defaults) => {
  log.info(`Setting new defaults for ${gameVersion}`);
  log.info(defaults);
  const gameS = getGameSettings(gameId.toString());
  gameS[gameVersion].defaults = defaults;
  setGameSettings(gameId.toString(), gameS);
});

ipcMain.handle('get-wago-settings', (_event, gameVersion) => getWago(gameVersion));

ipcMain.handle('set-wago-settings', (_event, gameVersion, settings) => setWago(gameVersion, settings));

ipcMain.handle('toggle-wago', (_event, gameVersion, enabled) => new Promise((resolve, reject) => {
  const wagoConf = getWago(gameVersion);
  wagoConf.enabled = enabled;
  setWago(gameVersion, wagoConf);
  if (!enabled) {
    log.info('Uninstalling WAGO Updater addon');
    uninstallCompanion(gameVersion)
      .then(() => {
        log.info('WAGO Updater uninstalled');
        return resolve();
      })
      .catch((e) => reject(e));
  }
  return resolve();
}));

ipcMain.handle('check-wago-updates', (event, gameVersion) => new Promise((resolve, reject) => {
  event.sender.send('app-status-message', 'Checking for Wago updates', 'status');
  return checkGameVersionForWagoUpdates(gameVersion)
    .then((newWagoSettings) => {
      event.sender.send('app-status-message', 'Done checking for Wago updates', 'success');
      return resolve(newWagoSettings);
    })
    .catch((error) => {
      event.sender.send('app-status-message', 'Error checking for Wago updates', 'error');
      return reject(error);
    });
}));
