const { ipcMain } = require('electron');
const syncService = require('../../services/sync-service');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('is-sync-enabled', (event, gameId, gameVersion) => {
    let gameS = storageService.getGameSettings(gameId)
    event.returnValue = gameS[gameVersion].sync;
})
