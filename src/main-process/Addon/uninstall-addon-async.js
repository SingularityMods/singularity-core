const { ipcMain } = require('electron');
const path = require('path');

const authService = require('../../services/auth-service');
const fileService = require('../../services/file-service');
const storageService = require('../../services/storage-service');
const syncService = require('../../services/sync-service');

const log = require('electron-log');

ipcMain.on('uninstall-addon', async (event, gameId, gameVersion, addonId) => {
    let gameS = storageService.getGameSettings(gameId.toString());
    let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
    if (process.platform === "win32") {
        var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].addonDir);
    } else if (process.platform === "darwin") {
        var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].macAddonDir);
    }
    let installedAddons = gameS[gameVersion].installedAddons;
    var addon = installedAddons.find((a) => {
        return a.addonId === addonId;
    })
    if (addon) {

        fileService.uninstallAddon(gameId, addonDir, addon)
            .then(msg => {
                let installedAddons = gameS[gameVersion].installedAddons;
                installedAddons = installedAddons.filter(obj => {
                    return obj.addonId !== addonId;
                })
                gameS[gameVersion].installedAddons = installedAddons;
                storageService.setGameSettings(gameId.toString(), gameS);
                event.sender.send('addon-uninstalled', addonId);
                if (gameS[gameVersion].sync && authService.isAuthenticated()) {
                    log.info('Game version is configured to sync, updating profile');
                    syncService.createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
                    .then(() => {
                        log.info('Sync profile updated');
                    })
                    .catch(err => {
                        log.error('Error saving sync profile');
                        log.error(err);
                    })
                }
            }).catch(err => {
                event.sender.send('addon-uninstall-failed', addonId);
                log.error(err);
            })
    } else {
        event.sender.send('addon-uninstall-failed', addonId);
    }
})