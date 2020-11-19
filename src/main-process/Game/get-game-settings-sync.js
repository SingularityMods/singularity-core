const { ipcMain } = require('electron');
const storageService = require('../../services/storage-service');

ipcMain.on('get-installation-state', (event, arg) => {
    event.returnValue = storageService.getGameSettings(arg).installed;
});

ipcMain.on('get-game-settings', (event, gameId) => {
    event.returnValue = storageService.getGameSettings(gameId.toString());
});
