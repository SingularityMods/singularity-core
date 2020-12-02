const { ipcMain } = require('electron');

const fileService = require('../../services/file-service');

const log = require('electron-log');

ipcMain.on('is-sync-profile-updating', (event) => {
    event.returnValue = fileService.isSearchingForProfiles();
})
