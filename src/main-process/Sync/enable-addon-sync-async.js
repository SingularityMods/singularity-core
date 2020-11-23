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
const { sync } = require('glob');



ipcMain.on('enable-addon-sync', async (event, gameId, gameVersion) => {
    log.info('Enabling addon sync for '+gameVersion);
    log.info('Checking for existing sync profile');
    event.sender.send('sync-status', gameId, gameVersion, 'checking-cloud', null, null)   
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
            event.sender.send('sync-status', gameId, gameVersion, 'profile-found', res.data.profile.lastSync, null)              
        } else {
            log.info('No addon sync profile found');
            event.sender.send('sync-status', gameId, gameVersion, 'creating-profile', null, null)  
            syncService.createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
            .then(() => {
                event.sender.send('sync-status', gameId, gameVersion, 'complete', new Date(), null)
            })
            .catch(e =>{
                console.log(e);
                event.sender.send('sync-status', gameId, gameVersion, 'error', null, 'Error creating new sync profile')
            })
        }
    })
    .catch((err) => {
        log.error(err);
        if (err.code && err.code == 'ENOTFOUND') {
            event.sender.send('sync-status', gameId, gameVersion, 'error', null, 'Failed due to network connection issue');
        } else {
            event.sender.send('sync-status', gameId, gameVersion, 'error', null, 'Error enabling sync profile');
        }
    })

/*
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
                event.sender.send('sync-profile-submitted', true, gameId, gameVersion, null);
            } else {
                log.error('Error pushing sync profile to the cloud');
                event.sender.send('sync-profile-submitted', false, gameId, gameVersion, 'Error pushing sync profile to the cloud'); 
            }
        })
    })
    .catch((err) => {
        log.error('Error pushing sync profile to the cloud');
        log.error(err);
        event.sender.send('sync-profile-submitted', false, gameId, gameVersion, 'Error pushing sync profile to the cloud'); 
    })*/
});
