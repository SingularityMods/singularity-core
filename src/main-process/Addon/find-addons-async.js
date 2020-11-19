const { ipcMain, net } = require('electron');
const storageService = require('../../services/storage-service');
const fileService = require('../../services/file-service');

const log = require('electron-log');

ipcMain.on('find-addons-async', async (event, gameId, gameVersion) =>{
    log.info('Called: find-addons');
    let gameS = storageService.getGameSettings(gameId.toString());
    let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;

    if (process.platform === "win32") {
        var hashMap = await fileService.fingerprintAllAsync(gameId, gameS[gameVersion].installPath, gameVersions[gameVersion].addonDir);
    } else if (process.platform === "darwin") {
        var hashMap = await fileService.fingerprintAllAsync(gameId, gameS[gameVersion].installPath, gameVersions[gameVersion].macAddonDir);
    }
    log.info('Fingerprinted '+Object.keys(hashMap).length+ 'directories for '+gameVersion);
    try{
        var result = await fileService.identifyAddons(gameId.toString(), gameVersion, hashMap)
    } catch (e) {
        log.error('Error attempting to identify addons for '+gameVerions +' in find-addons');
    }
        
})