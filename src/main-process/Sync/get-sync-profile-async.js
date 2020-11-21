const {app, ipcMain} = require('electron');
const authService = require('../../services/auth-service');

const axios = require('axios');

const log = require('electron-log');

ipcMain.on('get-sync-profile', async (event, gameId, gameVersion) => {
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
                storageService.setLocalAddonSyncProfile(gameId, gameVersion, res.data.profile)
                .then(() => {
                    event.sender.send('sync-profile-found', true, gameId, gameVersion, res.data.profile, null)  
                })
                .catch(err => {
                    event.sender.send('sync-profile-found', false, gameId, gameVersion, res.data.profile, 'Error saving profile locally')  
                })               
            } else {
                log.info('No addon sync profile found');
                event.sender.send('sync-profile-found',false, gameId, gameVersion, null, 'No addon sync profile found')
            }
        })
        .catch((err) => {
            log.error('Error fetching addon sync profile');
            log.error(err);
            event.sender.send('sync-profile-found',false, gameId, gameVersion, null, 'No addon sync profile found')
        })
    } else {
        log.info('User is not authenticated, nothing to sync');
        event.sender.send('sync-profile-found',false, gameId, gameVersion, null, 'User not authenticated')
    }
    
});