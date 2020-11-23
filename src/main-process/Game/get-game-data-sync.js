const { ipcMain } = require('electron');
const storageService = require('../../services/storage-service');

ipcMain.on('get-game-data', (event, gameId) => {
    event.returnValue = storageService.getGameData(gameId.toString());
});

ipcMain.on('get-game-addon-categories', (event, gameId) => {
    const categories = storageService.getGameData(gameId.toString()).categories;
    event.returnValue = categories.sort((a, b) => (a.name > b.name) ? 1 : -1);
});

ipcMain.on('get-game-addon-version', (event, gameId, gameVersion) => {
    let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
    event.returnValue = gameVersions[gameVersion].addonVersion;
});

ipcMain.on('get-game-name', (event, gameId) => {
    event.returnValue = storageService.getGameData(gameId.toString()).name;
});

ipcMain.on('get-game-icon-path', (event, gameId) => {
    event.returnValue = storageService.getGameData(gameId.toString()).iconPath;
});

ipcMain.on('get-game-tile-path', (event, gameId) => {
    event.returnValue = storageService.getGameData(gameId.toString()).tilePath;
});
