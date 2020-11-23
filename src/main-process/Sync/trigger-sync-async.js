const {app, ipcMain} = require('electron');
const authService = require('../../services/auth-service');
const syncService = require('../../services/sync-service');
const fileService = require('../../services/file-service');

const axios = require('axios');

const log = require('electron-log');

ipcMain.on('trigger-sync', async (event, gameId, gameVersion) => {
    if (authService.isAuthenticated()) {
        log.info('Fetching addon sync profile');    
        let axiosConfig = {
            headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'Singularity-'+app.getVersion(),
            'x-auth': authService.getAccessToken()}
        };
        axios.get(`https://api.singularitymods.com/api/v1/user/sync/get?gameId=${gameId}&gameVersion=${gameVersion}`, axiosConfig)
        .then( res => {
            if (res.status === 200 && res.data.success) {
                log.info('Addon sync profile found');
                fileService.syncFromProfile(res.data.profile)      
            } else if (res.status === 200 ){
                log.info('No addon sync profile found');
                syncService.createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
            } else {
                return Promise.reject('Error searching for sync profile');
            }
        })
        .then(() => {
            log.info('Sync process complete');
            event.sender.send('sync-status', gameId, gameVersion, 'sync-complete', new Date(), null);
        })
        .catch((err) => {
            log.error('Error handling addon sync');
            log.error(err);
            if (err instanceof String) {
                event.sender.send('sync-complete',false, gameId, gameVersion, err);
            } else {
                event.sender.send('sync-complete',false, gameId, gameVersion, 'Error handling addon sync');
            }
        })
    } else {
        log.info('User is not authenticated, nothing to sync');
        event.sender.send('sync-complete',false, gameId, gameVersion, 'User not authenticated');
    }
    
});