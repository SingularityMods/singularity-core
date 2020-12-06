import { ipcMain, dialog } from 'electron';
import path from 'path';
import log from 'electron-log';

import { findAndUpdateAddons, findInstalledWoWVersions } from '../../services/file.service';
import { getGameData, getGameSettings, setGameSettings } from '../../services/storage.service';

ipcMain.on('auto-find-game', (event, gameId) => {
  const { gameVersions } = getGameData(gameId.toString());
  let foundInstall = false;
  if (gameId === 1) {
    gameVersions.forEach((gameVersion) => {
      if (process.platform === 'win32') {
        const defaultPath = gameVersions[gameVersion].defaultWinInstallPath;
        const installedVersions = findInstalledWoWVersions(defaultPath);
        if (installedVersions && installedVersions.length > 0) {
          foundInstall = true;
          const currentSettings = getGameSettings(gameId.toString());
          currentSettings[gameVersion].installed = true;
          currentSettings[gameVersion].installPath = defaultPath;
          setGameSettings(gameId.toString(), currentSettings);
        }
      } else if (process.platform === 'darwin') {
        const defaultPath = gameVersions[gameVersion].defaultMacInstallPath;
        const installedVersions = findInstalledWoWVersions(defaultPath);
        if (installedVersions && installedVersions.length > 0) {
          foundInstall = true;
          const currentSettings = getGameSettings(gameId.toString());
          currentSettings[gameVersion].installed = true;
          currentSettings[gameVersion].installPath = defaultPath;
          setGameSettings(gameId.toString(), currentSettings);
        }
      }
    });
  }
  if (foundInstall) {
    event.sender.send('installation-found');
    findAndUpdateAddons();
  } else {
    event.sender.send('installation-not-found', "We couldn't find the game. Try finding it manually?");
  }
});

ipcMain.on('manually-find-game', (event, gameId) => {
  dialog.showOpenDialog({
    properties: ['openDirectory'],
  }).then((result) => {
    if (!result.canceled && result.filePaths) {
      const [resultPath] = result.filePaths;
      if (gameId === 1) {
        const installedVersions = findInstalledWoWVersions(result.filePaths[0]);
        if (installedVersions && installedVersions.length > 0) {
          const currentSettings = getGameSettings(gameId.toString());
          installedVersions.forEach((version) => {
            currentSettings[version].installed = true;
            let p;
            switch (version) {
              case 'wow_retail':
                if (!resultPath.includes('_retail_')) {
                  p = path.join(resultPath, '_retail_');
                } else {
                  p = resultPath;
                }
                break;
              case 'wow_classic':
                if (!resultPath.includes('_classic_')) {
                  p = path.join(resultPath, '_classic_');
                } else {
                  p = resultPath;
                }
                break;
              case 'wow_retail_ptr':
                if (!resultPath.includes('_ptr_')) {
                  p = path.join(resultPath, '_ptr_');
                } else {
                  p = resultPath;
                }
                break;
              case 'wow_classic_ptr':
                if (!resultPath.includes('_classic_ptr_')) {
                  p = path.join(resultPath, '_classic_ptr_');
                } else {
                  p = resultPath;
                }
                break;
              case 'wow_retail_beta':
                if (!resultPath.includes('_beta_')) {
                  p = path.join(resultPath, '_beta_');
                } else {
                  p = resultPath;
                }
                break;
              case 'wow_classic_beta':
                if (!resultPath.includes('_classic_beta_')) {
                  p = path.join(resultPath, '_classic_beta_');
                } else {
                  p = resultPath;
                }
                break;
              default:
                if (!resultPath.includes('_retail_')) {
                  p = path.join(resultPath, '_retail_');
                } else {
                  p = resultPath;
                }
                break;
            }
            currentSettings[version].installPath = p;
          });
          setGameSettings(gameId.toString(), currentSettings);
          event.sender.send('installation-found');
          findAndUpdateAddons();
        } else {
          event.sender.send('installation-not-found', "We couldn't find a valid game in that directory");
        }
      }
    }
  }).catch((err) => {
    log.error(err);
  });
});

ipcMain.on('set-game-defaults', (_event, gameId, gameVersion, defaults) => {
  log.info(`Setting new defaults for ${gameVersion}`);
  log.info(defaults);
  const gameS = getGameSettings(gameId.toString());
  gameS[gameVersion].defaults = defaults;
  setGameSettings(gameId.toString(), gameS);
});
