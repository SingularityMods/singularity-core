const { ipcMain, net } = require('electron');
const storageService = require('../../services/storage-service');
const fileService = require('../../services/file-service');

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
    
});