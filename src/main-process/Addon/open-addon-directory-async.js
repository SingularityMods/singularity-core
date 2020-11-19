const { ipcMain, shell } = require('electron');
const storageService = require('../../services/storage-service');
const path = require('path');

const log = require('electron-log');

ipcMain.on('open-addon-directory', (event, gameId, gameVersion, directory) => {
    let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
    let gameS = storageService.getGameSettings(gameId.toString());
    if (process.platform === "win32") {
        var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].addonDir, directory);
    } else if (process.platform === "darwin") {
        var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].macAddonDir, directory);
    }
    shell.openPath(addonDir);
});