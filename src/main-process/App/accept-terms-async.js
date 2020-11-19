const { ipcMain} = require('electron');
const storageService = require('../../services/storage-service');

ipcMain.on('accept-terms', (event, termType) => {
    let terms = storageService.getAppData(termType);
    terms.accepted = true;
    terms.acceptedOn = new Date();
    storageService.setAppData(termType, terms);
})
