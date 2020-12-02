const { ipcMain, BrowserWindow } = require('electron');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('set-game-defaults', (event, gameId, gameVersion, defaults) => {
    log.info('Setting new defaults for '+gameVersion);
    log.info(defaults);
    let gameS = storageService.getGameSettings(gameId.toString());
    gameS[gameVersion].defaults = defaults;
    storageService.setGameSettings(gameId.toString(),gameS)   
});