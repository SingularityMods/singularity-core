
const {ipcMain} = require('electron');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('get-local-backups-sync', (event, gameId, gameVersion) => {
    let backupData = storageService.getBackupData(gameId.toString())
    event.returnValue = backupData[gameVersion].backups;
})
