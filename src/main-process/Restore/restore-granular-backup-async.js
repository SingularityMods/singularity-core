const {app, ipcMain} = require('electron');

const log = require('electron-log');
const fileService = require('../../services/file-service');

ipcMain.on('restore-granular-backup', async (event, backup, includeSettings) => {
    log.info('Restoring granular backup'); 
    fileService.restoreGranularBackup(backup, includeSettings)
    .then( success => {
        event.sender.send('granular-restore-complete', true, null);
    })
    .catch( err => {
        event.sender.send('granular-restore-complete', false, err);
    })

});