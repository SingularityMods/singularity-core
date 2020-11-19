const { ipcMain } = require('electron');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('change-addon-ignore-update', (event, gameId, gameVersion, addonId, toggle) => {
    log.info('Changing ignore update settings for: '+addonId+' to: '+toggle);

    let gameS = storageService.getGameSettings(gameId.toString());
    let installedAddons = gameS[gameVersion].installedAddons;

    let addon = installedAddons.find( (a) => {
        return a.addonId == addonId;
    });
    addon.ignoreUpdate = toggle;

    installedAddons = installedAddons.map(a => 
        a.addonId === addonId
            ?   addon
            :   a
    );
    gameS[gameVersion].installedAddons = installedAddons;
    storageService.setGameSettings(gameId.toString(), gameS);
    event.sender.send('addon-settings-updated',addonId, addon);   
});