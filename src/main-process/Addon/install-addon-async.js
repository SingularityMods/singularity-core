const { ipcMain } = require('electron');
const path = require('path');

const authService = require('../../services/auth-service');
const fileService = require('../../services/file-service');
const storageService = require('../../services/storage-service');
const syncService = require('../../services/sync-service');


const log = require('electron-log');


ipcMain.on('install-addon', async (event, gameId, gameVersionFlavor, addon, branch) => {
    let gameS = storageService.getGameSettings(gameId.toString());
    let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
    let addonVersionFlavor = gameVersions[gameVersionFlavor].addonVersion;
    if (process.platform === "win32") {
        var addonDir = path.join(gameS[gameVersionFlavor].installPath, gameVersions[gameVersionFlavor].addonDir);
    } else if (process.platform === "darwin") {
        var addonDir = path.join(gameS[gameVersionFlavor].installPath, gameVersions[gameVersionFlavor].macAddonDir);
    }
    
    let installedFile = {}
    for (var i in addon.latestFiles) {
        if (addon.latestFiles[i].gameVersionFlavor == addonVersionFlavor && addon.latestFiles[i].releaseType == branch) {
            installedFile = addon.latestFiles[i]
        }
    }
    fileService.installAddon(gameId, addonDir, installedFile)
        .then(msg => {
            

            var trackBranch = addon.trackBranch || 1;
            var autoUpdate = addon.autoUpdate || false;
            var ignoreUpdate = addon.ignoreUpdate || false;

            var updateAvailable = false;
            var updateFile = addon.latestFiles.find( (f) => {
                return (f.gameVersion == addonVersionFlavor && f.releaseType <= trackBranch && f.fileDate > installedFile.fileDate)
            })
            if (updateFile) {
                updateAvailable = true;
            } else {
                updateFile = {}
            }
            let installedAddon = {
                "addonName": addon.addonName,
                "addonId": addon.addonId,
                "primaryCategory": addon.primaryCategory,
                "author": addon.author,
                "fileName": installedFile.fileName,
                "fileDate": installedFile.fileDate,
                "releaseType": installedFile.releaseType,
                "gameVersion": installedFile.gameVersion[0],
                "modules": installedFile.modules,
                "latestFiles":addon.latestFiles,
                "installedFile": installedFile,
                "updateAvailable": updateAvailable,
                "updateFile": updateFile,
                "brokenInstallation": false,
                "unknownUpdate": false,
                "trackBranch": trackBranch,
                "autoUpdate": autoUpdate,
                "ignoreUpdate": ignoreUpdate

            }
            let installedAddons = gameS[gameVersionFlavor].installedAddons.filter(obj => {
                return obj.addonId !== installedAddon.addonId;
            })
            installedAddons.push(installedAddon)
            gameS[gameVersionFlavor].installedAddons = installedAddons;
            storageService.setGameSettings(gameId.toString(), gameS);
            event.sender.send('addon-installed', installedAddon);
            if (gameS[gameVersionFlavor].sync && authService.isAuthenticated()) {
                log.info('Game version is configured to sync, updating profile');
                syncService.createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersionFlavor})
                .then(() => {
                    log.info('Sync profile updated');
                })
                .catch(err => {
                    log.error('Error saving sync profile');
                    log.error(err);
                })
            }
        })
        .catch(err => {
            log.error(err);
        })
})
