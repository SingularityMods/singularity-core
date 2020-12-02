const { ipcMain, app } = require('electron');
const axios = require('axios');

const authService = require('../../services/auth-service');
const fileService = require('../../services/file-service');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('find-addons-async', async (event, gameId, gameVersion) =>{
    log.info('Called: find-addons');
    let gameS = storageService.getGameSettings(gameId.toString());
    let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
    if (gameS[gameVersion].sync) {
        event.sender.send('sync-status', gameId, gameVersion, 'sync-started', null, null)   
    }

    if (process.platform === "win32") {
        var hashMap = await fileService.fingerprintAllAsync(gameId, gameS[gameVersion].installPath, gameVersions[gameVersion].addonDir);
    } else if (process.platform === "darwin") {
        var hashMap = await fileService.fingerprintAllAsync(gameId, gameS[gameVersion].installPath, gameVersions[gameVersion].macAddonDir);
    }
    log.info('Fingerprinted '+Object.keys(hashMap).length+ 'directories for '+gameVersion);
    fileService.identifyAddons(gameId.toString(), gameVersion, hashMap)
    .then(result => {
        if (gameS[gameVersion].sync) {
            log.info('Sync enabled for game version')
            if (authService.isAuthenticated()) {
                log.info('Fetching addon sync profile');    
                let axiosConfig = {
                    headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'User-Agent': 'Singularity-'+app.getVersion(),
                    'x-auth': authService.getAccessToken()}
                };
                event.sender.send('sync-status', gameId, gameVersion, 'checking-cloud', null, null)   
                axios.get(`https://api.singularitymods.com/api/v1/user/sync/get?gameId=${gameId}&gameVersion=${gameVersion}`, axiosConfig)
                .then( res => {
                    if (res.status === 200 && res.data.success) {
                        log.info('Addon sync profile found');
                        fileService.syncFromProfile(res.data.profile)      
                    } else if (res.status === 200 ){
                        log.info('No addon sync profile found');
                        fileService.createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
                    } else {
                        return Promise.reject('Error searching for sync profile');
                    }
                })
                .then(() => {
                    log.info('Sync process complete');
                    event.sender.send('sync-status', gameId, gameVersion, 'sync-complete', new Date(), null)   
                    //event.sender.send('sync-complete',true, gameId, gameVersion, null);
                })
                .catch((err) => {
                    log.error('Error handling addon sync');
                    log.error(err);
                    if (err instanceof String) {
                        event.sender.send('sync-status', gameId, gameVersion, 'error', null, err)  
                        //event.sender.send('sync-complete',false, gameId, gameVersion, err);
                    } else {
                        event.sender.send('sync-status', gameId, gameVersion, 'error', null, 'Error handling addon sync')  
                        //event.sender.send('sync-complete',false, gameId, gameVersion, 'Error handling addon sync');
                    }
                })
            } else {
                log.info('User is not authenticated, nothing to sync');
                event.sender.send('sync-status', gameId, gameVersion, 'error', null, 'User not authenticated')
                //event.sender.send('sync-complete',false, gameId, gameVersion, 'User not authenticated');
            }
        }
    })
    .catch(err => {
        console.log(err);
        log.error('Error attempting to identify addons for '+gameVersion +' in find-addons');
    })
        
})