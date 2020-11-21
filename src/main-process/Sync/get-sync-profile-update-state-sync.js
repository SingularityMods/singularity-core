const { ipcMain } = require('electron');
const syncService = require('../../services/sync-service');

const log = require('electron-log');

ipcMain.on('is-sync-profile-updating', (event) => {
    event.returnValue = syncService.isSearchingForProfiles();
})
