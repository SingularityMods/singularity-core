const { ipcMain, dialog } = require('electron');
const path = require('path');
const storageService = require('../../services/storage-service');
const fileService = require('../../services/file-service');

const log = require('electron-log');

ipcMain.on('update-wow-path', (event, gameVersion) => {
    var gameId = 1;
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }).then(result => {
        if (!result.canceled && result.filePaths) {
            var installedVersions = fileService.findInstalledWoWVersions(result.filePaths[0]);
            if (installedVersions && installedVersions.length > 0) {
                let currentSettings = storageService.getGameSettings(gameId.toString());
                if (installedVersions.includes(gameVersion)) {                                
                    currentSettings[gameVersion].installed = true;
                    switch (gameVersion) {
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
                    currentSettings[gameVersion].installPath = p;
                    storageService.setGameSettings(gameId.toString(), currentSettings);
                    event.sender.send('installation-path-updated', gameVersion, p);
                } else {
                    event.sender.send('installation-not-found', gameVersion);
                }
            } else {
                event.sender.send('installation-not-found', gameVersion);
            }
        }
    }).catch(err => {
        log.error(err);
        event.sender.send('installation-not-found', gameVersion);
    })
});