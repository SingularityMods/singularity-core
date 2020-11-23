const { ipcMain } = require('electron');

const authService = require('../../services/auth-service');
const storageService = require('../../services/storage-service');
const syncService = require('../../services/sync-service');

const log = require('electron-log');

ipcMain.on('change-addon-auto-update', (event, gameId, gameVersion, addonId, toggle) => {
    log.info('Changing auto update settings for: '+addonId+' to: '+toggle);

    let gameS = storageService.getGameSettings(gameId.toString());
    let installedAddons = gameS[gameVersion].installedAddons;

    let addon = installedAddons.find( (a) => {
        return a.addonId == addonId;
    });
    addon.autoUpdate = toggle;

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
        syncService.createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
        .then(() => {
            log.info('Sync profile updated');
        })
        .catch(err => {
            log.error('Error saving sync profile');
            log.error(err);
        })
    } 
});