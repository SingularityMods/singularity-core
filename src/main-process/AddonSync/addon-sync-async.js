import {app, ipcMain} from 'electron';
import axios from 'axios';
import log from 'electron-log';

import { getAccessToken, isAuthenticated } from '../../services/auth.service';
import {
  createAndSaveSyncProfile, 
  createSyncProfileObj,
  isSearchingForProfiles,
  syncFromProfile 
} from '../../services/file.service';
import { getGameSettings, setGameSettings } from '../../services/storage.service';

ipcMain.on('create-sync-profile', async (event, gameId, gameVersion) => {
    log.info('Creating addon sync profile');
    createSyncProfileObj(gameId, gameVersion)
    .then(profile => {
        let axiosConfig = {
            headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'Singularity-'+app.getVersion(),
            'x-auth': getAccessToken()}
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

ipcMain.on('enable-addon-sync', async (event, gameId, gameVersion) => {
    log.info('Enabling addon sync for '+gameVersion);
    log.info('Checking for existing sync profile');
    event.sender.send('sync-status', gameId, gameVersion, 'checking-cloud', null, null)   
    let axiosConfig = {
        headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Singularity-'+app.getVersion(),
        'x-auth': getAccessToken()}
    };
    axios.get(`https://api.singularitymods.com/api/v1/user/sync/get?gameId=${gameId}&gameVersion=${gameVersion}`, axiosConfig)
    .then( res => {
        if (res.status === 200 && res.data.success) {
            log.info('Addon sync profile found');
            event.sender.send('sync-status', gameId, gameVersion, 'profile-found', res.data.profile.lastSync, null)              
        } else {
            log.info('No addon sync profile found');
            event.sender.send('sync-status', gameId, gameVersion, 'creating-profile', null, null)  
            createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
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
});

ipcMain.on('toggle-addon-sync', (event, gameId, gameVersion, toggle) => {
    log.info('Saving addon sync for '+gameVersion+' - '+toggle);
    let gameS = getGameSettings(gameId.toString());
    gameS[gameVersion].sync = toggle;
    setGameSettings(gameId.toString(), gameS);
});

ipcMain.on('trigger-sync', async (event, gameId, gameVersion) => {
    if (isAuthenticated()) {
        log.info('Fetching addon sync profile');    
        let axiosConfig = {
            headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'Singularity-'+app.getVersion(),
            'x-auth': getAccessToken()}
        };
        axios.get(`https://api.singularitymods.com/api/v1/user/sync/get?gameId=${gameId}&gameVersion=${gameVersion}`, axiosConfig)
        .then( res => {
            if (res.status === 200 && res.data.success) {
                log.info('Addon sync profile found');
                return syncFromProfile(res.data.profile)      
            } else if (res.status === 200 ){
                log.info('No addon sync profile found');
                return createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
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