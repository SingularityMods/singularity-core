const {app, ipcMain} = require('electron');
const authService = require('../../services/auth-service');

ipcMain.on('get-profile', (event) => {
    event.returnValue = authService.getProfile();
});