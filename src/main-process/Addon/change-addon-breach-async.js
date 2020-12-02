const { ipcMain } = require('electron');

const authService = require('../../services/auth-service')
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('change-addon-branch', (event, gameId, gameVersion, addonId, branch) => {
    log.info('Changing release branch for: '+addonId+' to: '+branch);
    let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
    let gameS = storageService.getGameSettings(gameId.toString());
    let addonVersion = gameVersions[gameVersion].addonVersion;
    let installedAddons = gameS[gameVersion].installedAddons;
    let addon = installedAddons.find( (a) => {
        return a.addonId == addonId;
    });
    addon.trackBranch = branch;
    addon.updateAvailable = false;
    addon.updatefile = {};

    let possibleFiles = addon.latestFiles.filter((file) => {
        return (file.releaseType <= addon.trackBranch && file.gameVersionFlavor == addonVersion);
    });
    if (possibleFiles && possibleFiles.length > 0) {
        let latestFile = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
        if (addon.installedFile.fileDate < latestFile.fileDate) {
            addon.updateAvailable = true;
            addon.updatefile = latestFile;
        }
    }
    

    installedAddons = installedAddons.map(a => 
        a.addonId === addonId
            ?   addon
            :   a
    );
    gameS[gameVersion].installedAddons = installedAddons;
    storageService.setGameSettings(gameId.toString(), gameS);
    event.sender.send('addon-settings-updated',addonId, addon);
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
});