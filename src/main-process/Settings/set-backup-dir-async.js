const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('select-backup-dir', (event) => {
    log.info('Request to change backup directory');
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }).then(result => {
        if (!result.canceled && result.filePaths) {
            event.sender.send('moving-backup-dir');
            try {
                log.info('Changing backup directory to: ' + result.filePaths[0]);
                fs.accessSync(result.filePaths[0], fs.constants.R_OK | fs.constants.W_OK);
                let userConfig = storageService.getAppData('userConfigurable');
                if (fs.existsSync(path.join(userConfig.backupDir, 'backup'))) {
                    log.info('Copying backup data to new directory');
                    ncp(path.join(userConfig.backupDir, 'backup'), path.join(result.filePaths[0], 'backup'), function (err) {
                        if (err) {
                            log.error(err);
                            event.sender.send('backup-dir-rejected', "Error moving existing backups to new directory.");
                        }
                        log.info('Finished copying backup data to new directory. Deleting old versions.');
                        fs.rmdir(path.join(userConfig.backupDir, 'backup'), { recursive: true }, (err) => {
                            if (err) {
                                log.error(err);
                                event.sender.send('backup-dir-rejected', "Error cleaning up old backup directory.");
                            }
                            log.info('Finished deleting old backup data.')
                            userConfig.backupDir = result.filePaths[0];
                            storageService.setAppData('userConfigurable', userConfig);
                            event.sender.send('backup-dir-accepted');
                        });
                    });
                } else {
                    log.info('No previous backup data to copy');
                    userConfig.backupDir = result.filePaths[0];
                    storageService.setAppData('userConfigurable', userConfig);
                    event.sender.send('backup-dir-accepted');
                }
            } catch (err) {
                log.error(err);
                event.sender.send('backup-dir-rejected', "We don't have permissions to write to that directory.");
            }
        } else {
            log.info('User exited window or file path not selected');
            event.sender.send('backup-dir-rejected', "");
        }
    }).catch(err => {
        log.error(err);
    })
});