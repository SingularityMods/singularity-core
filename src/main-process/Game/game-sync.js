import { ipcMain } from 'electron';
import { getGameData, getGameSettings } from '../../services/storage.service';

ipcMain.on('get-game-data', (event, gameId) => {
    event.returnValue = getGameData(gameId.toString());
});

ipcMain.on('get-game-addon-categories', (event, gameId) => {
    const categories = getGameData(gameId.toString()).categories;
    event.returnValue = categories.sort((a, b) => (a.name > b.name) ? 1 : -1);
});

ipcMain.on('get-game-addon-version', (event, gameId, gameVersion) => {
    let gameVersions = getGameData(gameId.toString()).gameVersions;
    event.returnValue = gameVersions[gameVersion].addonVersion;
});

ipcMain.on('get-game-name', (event, gameId) => {
    event.returnValue = getGameData(gameId.toString()).name;
});

ipcMain.on('get-game-icon-path', (event, gameId) => {
    event.returnValue = getGameData(gameId.toString()).iconPath;
});

ipcMain.on('get-game-tile-path', (event, gameId) => {
    event.returnValue = getGameData(gameId.toString()).tilePath;
});

ipcMain.on('get-installation-state', (event, arg) => {
  event.returnValue = getGameSettings(arg).installed;
});

ipcMain.on('get-game-settings', (event, gameId) => {
  event.returnValue = getGameSettings(gameId.toString());
});