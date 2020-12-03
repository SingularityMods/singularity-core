import { ipcMain, dialog } from 'electron';
import path from 'path';
import log from 'electron-log';

import { findAndUpdateAddons, findInstalledWoWVersions } from '../../services/file.service';
import { getGameData, getGameSettings, setGameSettings } from '../../services/storage.service';

ipcMain.on('auto-find-game', (event, gameId) => {
    let gameVersions = getGameData(gameId.toString()).gameVersions;
    var foundInstall = false;
    for (var gameVersion in gameVersions) {        
        if (gameId == 1) {
            if (process.platform === "win32") {
                let defaultPath = gameVersions[gameVersion].defaultWinInstallPath; //TODO: Move default patch to root directory instead of version directory
                let installedVersions = findInstalledWoWVersions(defaultPath);
                if (installedVersions && installedVersions.length > 0) {
                    foundInstall = true;
                    let currentSettings = getGameSettings(gameId.toString());
                    currentSettings[gameVersion].installed = true;
                    currentSettings[gameVersion].installPath = defaultPath;
                    setGameSettings(gameId.toString(), currentSettings);
                }
            }
            else if (process.platform === "darwin") {
                let defaultPath = gameVersions[gameVersion].defaultMacInstallPath;
                let installedVersions = findInstalledWoWVersions(defaultPath);
                if (installedVersions && installedVersions.length > 0) {
                    foundInstall = true;
                    let currentSettings = getGameSettings(gameId.toString());
                    currentSettings[gameVersion].installed = true;
                    currentSettings[gameVersion].installPath = defaultPath;
                    setGameSettings(gameId.toString(), currentSettings);
                }
            }
        }
    }
    if (foundInstall) {
        event.sender.send('installation-found');
        findAndUpdateAddons();
    } else {
        event.sender.send('installation-not-found', "We couldn't find the game. Try finding it manually?");
    }
})

ipcMain.on('manually-find-game', (event, gameId) => {
  dialog.showOpenDialog({
      properties: ['openDirectory']
  }).then(result => {
      if (!result.canceled && result.filePaths) {
          if (gameId == 1) {
              var installedVersions = findInstalledWoWVersions(result.filePaths[0]);
              if (installedVersions && installedVersions.length > 0) {
                  let currentSettings = getGameSettings(gameId.toString());
                  installedVersions.forEach((version) => {                    
                      currentSettings[version].installed = true;
                      switch (version) {
                          case 'wow_retail':
                              if (!result.filePaths[0].includes('_retail_')) {
                                  var p = path.join(result.filePaths[0], '_retail_');
                              } else {
                                  var p = result.filePaths[0];
                              }
                              break;
                          case 'wow_classic':
                              if (!result.filePaths[0].includes('_classic_')) {
                                  var p = path.join(result.filePaths[0], '_classic_');
                              } else {
                                  var p = result.filePaths[0];
                              }
                              break;
                          case 'wow_retail_ptr':
                              if (!result.filePaths[0].includes('_ptr_')) {
                                  var p = path.join(result.filePaths[0], '_ptr_');
                              } else {
                                  var p = result.filePaths[0];
                              }
                              break;
                          case 'wow_classic_ptr':
                              if (!result.filePaths[0].includes('_classic_ptr_')) {
                                  var p = path.join(result.filePaths[0], '_classic_ptr_');
                              } else {
                                  var p = result.filePaths[0];
                              }
                              break;
                          case 'wow_retail_beta':
                              if (!result.filePaths[0].includes('_beta_')) {
                                  var p = path.join(result.filePaths[0], '_beta_');
                              } else {
                                  var p = result.filePaths[0];
                              }
                              break;
                      }
                      currentSettings[version].installPath = p;
                  })
                  setGameSettings(gameId.toString(), currentSettings)
                  event.sender.send('installation-found');
                  findAndUpdateAddons();
              } else {
                  event.sender.send('installation-not-found', "We couldn't find a valid game in that directory");
              }
          }
      }
  }).catch(err => {
      log.error(err);
  })
});

ipcMain.on('set-game-defaults', (event, gameId, gameVersion, defaults) => {
  log.info('Setting new defaults for '+gameVersion);
  log.info(defaults);
  let gameS = getGameSettings(gameId.toString());
  gameS[gameVersion].defaults = defaults;
  setGameSettings(gameId.toString(),gameS)   
});