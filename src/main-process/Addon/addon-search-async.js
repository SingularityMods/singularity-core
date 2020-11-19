const { ipcMain, net } = require('electron');
const storageService = require('../../services/storage-service');

const log = require('electron-log');

ipcMain.on('addon-search', (event, gameId, gameVersion, searchFilter, categoryId, page, pageSize) => {
    let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
    let addonVersion = gameVersions[gameVersion].addonVersion;

    var index = page * pageSize;
    if (categoryId == null) {
        categoryId = 0;
    }
    const request = net.request(`https://api.singularitymods.com/api/v1/addons/search?gameId=${gameId}&gameVersionFlavor=${addonVersion}&filter=${searchFilter}&category=${categoryId}&index=${index}`);
    request.setHeader('x-app-uuid', storageService.getAppData('UUID'));
    let body = ''
    request.on('error', (error) => {
        event.sender.send('addon-search-error');
        log.error(error);
    });
    request.on('response', (response) => {

        response.on('data', (chunk) => {
            body += chunk.toString()
        })

        response.on('end', () => {
            if (body) {
                var addons = JSON.parse(body);
                if (page == 0) {
                    event.sender.send('addon-search-result', addons);
                } else {
                    event.sender.send('additional-addon-search-result', addons);
                }
            } else {
                event.sender.send('addon-search-no-result');
            }           
        });

    });
    request.end();
});