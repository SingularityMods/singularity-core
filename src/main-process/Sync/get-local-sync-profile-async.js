const { ipcMain } = require('electron');
const syncService = require('../../services/sync-service');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('get-local-sync-profile', (event, gameId, gameVersion) => {
    syncService.getLocalSyncProfile(gameId, gameVersion)
    .then(profile => {
        event.sender.send('local-sync-profile-found', true, gameId, gameVersion, profile, null)
    })
    .catch(err => {
        log.error('Error retrieving local addon sync profile');
        log.error(err);
        event.sender.send('local-sync-profile-found', false, gameId, gameVersion, null, 'Error searching for local addon sync profile')
    })
})
