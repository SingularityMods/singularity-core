const {app, ipcMain} = require('electron');
const authService = require('../../services/auth-service');
const fileService = require('../../services/file-service');

const axios = require('axios');

const log = require('electron-log');

ipcMain.on('delete-granular-backup', async (event, backup) => {
    log.info('Deleting granular backup');
    fileService.deleteLocalBackup(backup)
    .then(() => {
        if (backup.cloud) {
            log.info('Deleting cloud backup');
            var postData = {
                backupUUID: backup.backupUUID
            };
            let axiosConfig = {
                headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'User-Agent': 'Singularity-'+app.getVersion(),
                'x-auth': authService.getAccessToken()}
            };
            return axios.post(`https://api.singularitymods.com/api/v1/user/deletebackup`,postData, axiosConfig)
        } else {
            log.info('Local backup deleted');
            event.sender.send('delete-backup-complete', true, null); 
            return Promise.resolve(null)
        }       
    })
    .then( res => {
        if (res) {
            if (res.status === 200) {
                log.info('Cloud backup deleted');
                event.sender.send('delete-backup-complete', true, null);          
            } else {
                log.error('Error deleting cloud backup');
                event.sender.send('delete-backup-complete', false, null); 
            }
        }
    })
    .catch((err) => {
        log.error('Error deleting cloud backup');
        log.error(err);
        event.sender.send('delete-backup-complete', false, null); 
    })
});