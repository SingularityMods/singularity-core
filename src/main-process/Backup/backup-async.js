const {app, ipcMain} = require('electron');
const { v4: uuidv4 } = require('uuid');
const { Readable } = require('stream') 
const storageService = require('../../services/storage-service');
const authService = require('../../services/auth-service');
const fileService = require('../../services/file-service');

const path = require('path');
const axios = require('axios');
const os = require('os');

const log = require('electron-log');

ipcMain.on('create-granular-backup', async (event, gameId, gameVersion, cloud) => {
    log.info('Creating granular backup');
    event.sender.send('backup-status', 'Initializing Backup'); 
    fileService.createGranularBackupObj(gameId, gameVersion)
    .then( backupObj => {
        var fileData = {
            version: 2,
            file: backupObj.encodedFile,
            time: new Date(),
            backupUUID: uuidv4(),
            gameId: gameId,
            gameVersion: gameVersion,
            addons: backupObj.addons,
            uuid: storageService.getAppData('UUID'),
            hostname: os.hostname()
        };
        let size = Buffer.byteLength(JSON.stringify(fileData))
        fileData.size = size;
        event.sender.send('backup-status', 'Saving Backup Locally'); 
        return storageService.saveBackupInfo(gameId.toString(), gameVersion, fileData)
        .then(() =>{
            return fileData
        })
    })
    .then(fileData => {
        if (cloud) {
            var postData = {
                version: fileData.version,
                time: fileData.time,
                size: fileData.size,
                backupUUID: fileData.backupUUID,
                gameId: fileData.gameId,
                gameVersion: fileData.gameVersion,
                addons: fileData.addons,
                uuid: fileData.uuid,
                hostname: fileData.hostname
            }
            let axiosConfig = {
                headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'User-Agent': 'Singularity-'+app.getVersion(),
                'x-auth': authService.getAccessToken()}
            };
            event.sender.send('backup-status', 'Saving Addon Backup To Cloud'); 
            return axios.post(`https://api.singularitymods.com/api/v1/user/backup`,postData, axiosConfig)
            .then( res => {
                if (res && res.status === 200 && res.data.success) {
                        log.info('Cloud backup info saved');
                        let uploadUrl = res.data.uploadUrl;
                        let backupId = res.data.backupId
                        let putConfig = {
                            'maxContentLength': Infinity,
                            'maxBodyLength': Infinity,
                            headers: {
                                "content-type": "application/zip",
                                'User-Agent': 'Singularity-'+app.getVersion()
                            }
                        };
                        let dataBuf = Buffer.from(fileData.file, 'base64')
                        log.info('Uploading settings file');
                        event.sender.send('backup-status', 'Saving Settings Backup To Cloud'); 
                        return axios.put(uploadUrl, dataBuf, putConfig)
                        .then( res2 => {
                            if (res2 && res2.status == 200) {
                                log.info('Settings uploaded, sending confirmation');
                                var confirmPostData = {
                                    backupId: res.data.backupId
                                }
                                var comirmPostConfig = {
                                    headers: {
                                        'Content-Type': 'application/json;charset=UTF-8',
                                        'User-Agent': 'Singularity-'+app.getVersion(),
                                        'x-auth': authService.getAccessToken()}
                                }
                                return axios.post(`https://api.singularitymods.com/api/v1/user/confirmbackup`,confirmPostData, comirmPostConfig)
                            }
                        })
                        .then ( res3 => {
                            if (res3) {
                                if (res3.status == 200) {
                                    log.info('Confirmed settings upload');
                                    event.sender.send('granular-backup-complete', true, 'cloud', gameId, gameVersion, null); 
                                } else {
                                    log.error('Error creating cloud backup');
                                        event.sender.send('granular-backup-complete', false, 'cloud', gameId, gameVersion, null); 
                                }
                            }
                        })
        
                        //event.sender.send('granular-backup-complete', true, 'cloud', gameId, gameVersion, null);          
                } else {
                    log.error('Error creating cloud backup');
                    event.sender.send('granular-backup-complete', false, 'cloud', gameId, gameVersion, null); 
                    return Promise.resolve(null)
                }
            })
        } else {
            event.sender.send('granular-backup-complete', true, 'local', gameId, gameVersion, null);
            return Promise.resolve(null)
        }
    })
    .catch((err) => {
        log.error('Error creating cloud backup');
        log.error(err);
        event.sender.send('granular-backup-complete', false, 'cloud', gameId, gameVersion, null); 
    })
});
