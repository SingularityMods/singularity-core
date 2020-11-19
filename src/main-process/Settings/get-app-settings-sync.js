const { ipcMain } = require('electron');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('get-app-settings', (event) => {
    event.returnValue = storageService.getAppData('userConfigurable');
});

ipcMain.on('is-sidebar-minimized', (event) => {
    event.returnValue = storageService.getAppData('sidebarMinimized');
});

ipcMain.on('get-default-wow-version', (event) => {
    event.returnValue = storageService.getAppData('userConfigurable').defaultWowVersion || 'wow_retail';
})

ipcMain.on('is-dark-mode', (event) => {
    event.returnValue = storageService.getAppData('userConfigurable').darkMode;
})