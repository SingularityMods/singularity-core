
const {ipcMain} = require('electron');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('get-local-backups', (event, gameId, gameVersion) => {
    storageService.getBackupDataAsync(gameId.toString())
    .then(backupData => {
        event.sender.send('local-backups-found', true, gameId, gameVersion, backupData[gameVersion].backups, null)
    })
    .catch(err => {
        log.error('Error retrieving local backups');
        log.error(err);
        event.sender.send('local-backups-found',false, gameId, gameVersion, null, 'Error searching for local backups')
    })
})
