const { ipcMain } = require('electron');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('toggle-addon-sync', (event, gameId, gameVersion, toggle) => {
    log.info('Saving addon sync for '+gameVersion+' - '+toggle)
    let gameS = storageService.getGameSettings(gameId.toString());
    gameS[gameVersion].sync = toggle;
    storageService.setGameSettings(gameId.toString(), gameS)
});