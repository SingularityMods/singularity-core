const { ipcMain } = require('electron');
const storageService = require('../../services/storage-service');
const fileService = require('../../services/file-service');

const log = require('electron-log');

ipcMain.on('auto-find-game', (event, gameId) => {
    let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
    var foundInstall = false;
    for (var gameVersion in gameVersions) {        
        if (gameId == 1) {
            if (process.platform === "win32") {
                let defaultPath = gameVersions[gameVersion].defaultWinInstallPath; //TODO: Move default patch to root directory instead of version directory
                let installedVersions = fileService.findInstalledWoWVersions(defaultPath);
                if (installedVersions && installedVersions.length > 0) {
                    foundInstall = true;
                    let currentSettings = storageService.getGameSettings(gameId.toString());
                    currentSettings[gameVersion].installed = true;
                    currentSettings[gameVersion].installPath = defaultPath;
                    storageService.setGameSettings(gameId.toString(), currentSettings);
                }
            }
            else if (process.platform === "darwin") {
                let defaultPath = gameVersions[gameVersion].defaultMacInstallPath;
                let installedVersions = fileService.findInstalledWoWVersions(defaultPath);
                if (installedVersions && installedVersions.length > 0) {
                    foundInstall = true;
                    let currentSettings = storageService.getGameSettings(gameId.toString());
                    currentSettings[gameVersion].installed = true;
                    currentSettings[gameVersion].installPath = defaultPath;
                    storageService.setGameSettings(gameId.toString(), currentSettings);
                }
            }
        }
    }
    if (foundInstall) {
        event.sender.send('installation-found');
        fileService.findAndUpdateAddons();
    } else {
        event.sender.send('installation-not-found', "We couldn't find the game. Try finding it manually?");
    }
})