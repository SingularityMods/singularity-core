const {app, ipcMain} = require('electron');
const { v4: uuidv4 } = require('uuid');
const storageService = require('../../services/storage-service');
const authService = require('../../services/auth-service');
const fileService = require('../../services/file-service');
const syncService = require('../../services/sync-service');

const path = require('path');
const axios = require('axios');
const os = require('os');

const log = require('electron-log');



ipcMain.on('create-sync-profile', async (event, gameId, gameVersion) => {
    log.info('Creating addon sync profile');
    syncService.createSyncProfileObj(gameId, gameVersion)
    .then(profile => {
        let axiosConfig = {
            headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'Singularity-'+app.getVersion(),
            'x-auth': authService.getAccessToken()}
        };
        return axios.post(`https://api.singularitymods.com/api/v1/user/sync/set`,profile, axiosConfig)
        .then(res => {
            if (res && res.status === 200 && res.data.success) {
                log.info('Addon sync profile created and saved');
                event.sender.send('sync-status', gameId, gameVersion, 'complete', new Date(), null)
            } else {
                log.error('Error pushing sync profile to the cloud');
                event.sender.send('sync-status', gameId, gameVersion, 'error', null, 'Error pushing sync profile to the cloud');
            }
        })
    })
    .catch((err) => {
        log.error('Error pushing sync profile to the cloud');
        log.error(err);
        event.sender.send('sync-status', gameId, gameVersion, 'error', null, 'Error pushing sync profile to the cloud');
    })
});
