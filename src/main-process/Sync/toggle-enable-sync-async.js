const { ipcMain, BrowserWindow } = require('electron');
const storageService = require('../../services/storage-service');
const fileService = require('../../services/file-service');

const log = require('electron-log');

ipcMain.on('toggle-enable-sync', (event, gameId, gameVersion, toggle) => {
    let gameS = storageService.getGameSettings(gameId);
    gameS[gameVersion].sync = toggle;
    storageService.setGameSettings(gameId, gameS)
});