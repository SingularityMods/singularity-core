const {app, ipcMain} = require('electron');
const { v4: uuidv4 } = require('uuid');
const authService = require('../../services/auth-service');

const axios = require('axios');

const log = require('electron-log');

ipcMain.on('get-cloud-backups', async (event, gameId, gameVersion) => {
    if (authService.isAuthenticated()) {
        log.info('Fetching cloud backups');    
        let axiosConfig = {
            headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'Singularity-'+app.getVersion(),
            'x-auth': authService.getAccessToken()}
        };
        axios.get(`https://api.singularitymods.com/api/v1/user/backups?gameId=${gameId}&gameVersion=${gameVersion}&version=2`, axiosConfig)
        .then( res => {
            if (res.status === 200 && res.data.success) {
                log.info('Cloud backups found');
                event.sender.send('cloud-backups-found', true, gameId, gameVersion, res.data.backups, null)       
            } else {
                log.info('No cloud backups found');
                event.sender.send('cloud-backups-found',false, gameId, gameVersion, null, 'No cloud backups found')
            }
        })
        .catch((err) => {
            log.error('Error fetching cloud backups');
            log.error(err);
            event.sender.send('cloud-backups-found',false, gameId, gameVersion, null, 'No cloud backups found')
        })
    } else {
        log.info('User is not authenticated, skipping cloud backup fetch');
        event.sender.send('cloud-backups-found',false, gameId, gameVersion, null, 'No cloud backups found')
    }
    
});