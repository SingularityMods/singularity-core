const { ipcMain, net } = require('electron');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('get-addon-info', (event, addonId) => {
    const request = net.request(`https://api.singularitymods.com/api/v1/addon/${addonId}`);
    request.setHeader('x-app-uuid', storageService.getAppData('UUID'));
    let body = ''
    request.on('error', (error) => {
        log.error(error);
    });
    request.on('response', (response) => {
        response.on('data', (chunk) => {
            if (chunk) {
                body += chunk.toString()
            }
        })
        response.on('end', () => {
            if (body) {
                var addon = JSON.parse(body);
                event.sender.send('addon-info-result', addon);
            } 
        });

    });
    request.end();
});