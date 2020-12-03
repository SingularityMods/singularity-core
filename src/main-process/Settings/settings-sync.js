import { ipcMain } from 'electron';

import { getAppData } from '../../services/storage.service';

const log = require('electron-log');

ipcMain.on('get-app-settings', (event) => {
    event.returnValue = getAppData('userConfigurable');
});

ipcMain.on('is-sidebar-minimized', (event) => {
    event.returnValue = getAppData('sidebarMinimized');
});

ipcMain.on('get-default-wow-version', (event) => {
    event.returnValue = getAppData('userConfigurable').defaultWowVersion || 'wow_retail';
})

ipcMain.on('is-dark-mode', (event) => {
    event.returnValue = getAppData('userConfigurable').darkMode;
})