const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');

const authService = require('../../services/auth-service');
const storageService = require('../../services/storage-service');
const fileService = require('../../services/file-service');

const log = require('electron-log');

ipcMain.on('update-addon', async (event, gameId, gameVersion, addon) => {
    log.info("Updating addon: " + addon.addonName);
    let gameS = storageService.getGameSettings(gameId.toString());
    let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
    let addonVersion = gameVersions[gameVersion].addonVersion;
    if (process.platform === "win32") {
        var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].addonDir);
    } else if (process.platform === "darwin") {
        var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].macAddonDir);
    }
    let possibleFiles = addon.latestFiles.filter((file) => {
        return (file.releaseType <= addon.trackBranch && file.gameVersionFlavor == addonVersion);
    });
    if (possibleFiles && possibleFiles.length > 0) {
        let latestFile = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
        fileService.updateAddon(gameId, addonDir, addon, latestFile)
            .then(msg => {
                addon.updateAvailable = false;
                addon.updateFile = {};
                addon.fileName = latestFile.fileName;
                addon.fileDate = latestFile.fileDate;
                addon.releaseType = latestFile.releaseType;
                addon.gameVersion = latestFile.gameVersion[0];
                addon.installedFile = latestFile;
                addon.modules = latestFile.modules;
                for (var a in gameS[gameVersion].installedAddons) {
                    if (gameS[gameVersion].installedAddons[a].addonId == addon.addonId) {
                        gameS[gameVersion].installedAddons[a] = addon;
                        break;
                    }
                }
                storageService.setGameSettings(gameId.toString(), gameS);
                event.sender.send('addon-installed', addon);
                if (gameS[gameVersion].sync && authService.isAuthenticated()) {
                    log.info('Game version is configured to sync, updating profile');
                    fileService.createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
                    .then(() => {
                        log.info('Sync profile updated');
                    })
                    .catch(err => {
                        log.error('Error saving sync profile');
                        log.error(err);
                    })
                }
            })
    } else {
        log.info("No updates found");
    }
    
})