const {app, ipcMain} = require('electron');
const storageService = require('../../services/storage-service');

ipcMain.on('is-app-update-available', (event) => {
    event.returnValue = storageService.getAppData('updatePending');
});

ipcMain.on('get-app-version', (event) => {
    event.returnValue = app.getVersion();
});

ipcMain.on('get-app-uuid', (event) => {
    event.returnValue = storageService.getAppData('UUID');
} )

ipcMain.on('get-new-terms', (event) => {
    let privacy = storageService.getAppData('privacy');
    let tos = storageService.getAppData('tos');
    var response = {
        privacy: false,
        privacyText: '',
        tos: false,
        tosText: ''
    }
    if (!privacy.accepted) {
        response.privacy = true;
        response.privacyText = privacy.text;
    }
    if (!tos.accepted) {
        response.tos = true;
        response.tosText = tos.text;
    }
    event.returnValue = response;
})