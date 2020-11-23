const { ipcMain, net } = require('electron');
const path = require('path');

const authService = require('../../services/auth-service');
const storageService = require('../../services/storage-service');
const fileService = require('../../services/file-service');
const syncService = require('../../services/sync-service');

const log = require('electron-log');

ipcMain.on('install-addon-file', async (event, gameId, gameVersionFlavor, addon, fileId) => {
    const request = net.request(`https://api.singularitymods.com/api/v1/file/${fileId}`);
    request.setHeader('x-app-uuid', storageService.getAppData('UUID'));
    let body = ''
    request.on('error', (error) => {
        log.error(error);
    });
    request.on('response', (response) => {
        response.on('data', (chunk) => {
            body += chunk.toString()
        })

        response.on('end', () => {
            if (body) {
                var f = JSON.parse(body);
                let gameS = storageService.getGameSettings(gameId.toString());
                let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
                let addonVersion = gameVersions[gameVersionFlavor].addonVersion;
                if (process.platform === "win32") {
                    var addonDir = path.join(gameS[gameVersionFlavor].installPath, gameVersions[gameVersionFlavor].addonDir);
                } else if (process.platform === "darwin") {
                    var addonDir = path.join(gameS[gameVersionFlavor].installPath, gameVersions[gameVersionFlavor].macAddonDir);
                }

                let installedFile = f;
                fileService.installAddon(gameId, addonDir, installedFile)
                    .then(msg => {
                        var updateAvailable = false;
                        var updateFile = {}
                        var trackBranch = addon.trackBranch || 1;
                        var autoUpdate = addon.autoUpdate || false;
                        var ignoreUpdate = addon.ignoreUpdate || false;

                        let possibleFiles = addon.latestFiles.filter((file) => {
                            return (file.releaseType <= trackBranch && file.gameVersionFlavor == addonVersion);
                        });
                        if (possibleFiles && possibleFiles.length > 0) {
                            let latestFile = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
                            if (installedFile.fileDate < latestFile.fileDate) {
                                updateAvailable = true;
                                updateFile = latestFile;
                            }
                        }
                        

                        let installedAddon = {
                            "addonName": addon.addonName,
                            "addonId": addon.addonId,
                            "primaryCategory":addon.primaryCategory,
                            "author": addon.author,
                            "fileName": installedFile.fileName,
                            "fileDate": installedFile.fileDate,
                            "releaseType": installedFile.releaseType,
                            "gameVersion": installedFile.gameVersion[0],
                            "modules": installedFile.modules,
                            "latestFiles":addon.latestFiles,
                            "installedFile": installedFile,
                            "updateAvailable": updateAvailable,
                            "updateFile": updateFile,
                            "brokenInstallation": false,
                            "unknownUpdate": false,
                            "trackBranch": trackBranch,
                            "autoUpdate": autoUpdate,
                            "ignoreUpdate": ignoreUpdate                      
                        }
                        let installedAddons = gameS[gameVersionFlavor].installedAddons.filter(obj => {
                            return obj.addonId !== installedAddon.addonId;
                        })
                        installedAddons.push(installedAddon)
                        gameS[gameVersionFlavor].installedAddons = installedAddons;
                        storageService.setGameSettings(gameId.toString(), gameS);
                        event.sender.send('addon-installed', installedAddon);
                        if (gameS[gameVersionFlavor].sync && authService.isAuthenticated()) {
                            log.info('Game version is configured to sync, updating profile');
                            syncService.createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersionFlavor})
                            .then(() => {
                                log.info('Sync profile updated');
                            })
                            .catch(err => {
                                log.error('Error saving sync profile');
                                log.error(err);
                            })
                        }
                    })
                    .catch(err => {
                        log.error(err);
                    })

            }


        });

    });
    request.end();
})