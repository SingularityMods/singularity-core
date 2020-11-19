const { ipcMain } = require('electron');
const storageService = require('../../services/storage-service');
const fileService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('manually-find-game', (event, gameId) => {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }).then(result => {
        if (!result.canceled && result.filePaths) {
            if (gameId == 1) {
                var installedVersions = fileService.findInstalledWoWVersions(result.filePaths[0]);
                if (installedVersions && installedVersions.length > 0) {
                    let currentSettings = storageService.getGameSettings(gameId.toString());
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
                    storageService.setGameSettings(gameId.toString(), currentSettings)
                    event.sender.send('installation-found');
                    checkAddons();
                } else {
                    event.sender.send('installation-not-found', "We couldn't find a valid game in that directory");
                }
            }
        }
    }).catch(err => {
        log.error(err);
    })
});