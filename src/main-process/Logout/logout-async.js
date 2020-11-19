const {app, ipcMain} = require('electron');
const authService = require('../../services/auth-service');

const log = require('electron-log');

ipcMain.on('logout-auth', async (event) => {
    authService.logout()
    .then(() => {
        log.info('User logged out');
        event.sender.send('auth-event','logout', true, null);
    })
    .catch(err => {
        event.sender.send('auth-event','logout', false,'Error logging out user');
    }) 
});