const { ipcMain } = require('electron');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('toggle-sidebar', (event, toggle) => {
    log.info('Saving sidebar toggle minimized: ' + toggle);
    storageService.setAppData('sidebarMinimized', toggle);
});