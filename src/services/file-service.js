const { app, net, BrowserWindow } = require('electron');
const { download } = require('electron-dl');
const extract = require('extract-zip');
const ncp = require('ncp').ncp;
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const hasha = require('hasha');
const streamBuffers = require('stream-buffers');
const PromisePool = require('es6-promise-pool');

const storageService = require('../services/storage-service');

const log = require('electron-log');


ncp.limit = 16;

let browserWindowId = 1;
let apiEndpoint = "https://api.singularitymods.com/api/v1/";

var autoUpdateAddonsLeft=[];
var cloudAddonsLeft = 0;
var cloudAddonsToRestore = [];

var syncedAddonsToInstall=[];
var syncedAddonsToRemove=[];

var updateInterval;

function setBrowserWindow(id) {
    browserWindowId = id;
}

function setAPIEndpoint(endpoint) {
    apiEndpoint = endpoint;
}

function installAddon(gameId, addonDir, addon) {
    return new Promise((resolve, reject) => {
        if (gameId == 1) {
            // World of Warcraft
            if (!fs.existsSync(addonDir)) {
                try {
                    fs.mkdirSync(addonDir, { recursive: true });
                } catch (err) {
                    log.error(err);
                    reject({ 'err': 'Addon Directory Does Not Exist' });
                }          
            }
            let tempDir = path.join(app.getPath("temp"), '/singularity');

            let win = BrowserWindow.fromId(browserWindowId);
            download(win, addon.downloadUrl, { directory: tempDir })
                .then(dItem => {
                    var savePath = dItem.getSavePath();
                    extract(savePath, { dir: addonDir })
                        .then(() => {
                            if (fs.existsSync(savePath)) {
                                fs.unlink(savePath, (err) => {
                                    if (err) {
                                        log.error(err);
                                        reject(err);
                                    }
                                    resolve('success');
                                });
                            } else {
                                resolve('success');
                            }
                        })
                        .catch(err => {
                            log.error(err);
                            reject('Error extracting addon update')
                        }); 
                })
                .catch(err => {
                    log.error(err);
                    reject('Error downloading adddon update');
                })
        }
    });
}

function installAddonFromSync(addon) {
    return new Promise((resolve, reject) => {
        log.info('Installing addon from sync profile: '+addon.addonName);
        const win = BrowserWindow.fromId(browserWindowId);
        win.webContents.send('sync-status',addon.gameId, addon.gameVersion,'Syncing: '+addon.addonName);
        let gameS = storageService.getGameSettings(addon.gameId.toString());
        let gameVersions = storageService.getGameData(addon.gameId.toString()).gameVersions;

        if (process.platform === "win32") {
            var addonDir = path.join(gameS[addon.gameVersion].installPath, gameVersions[addon.gameVersion].addonDir);
        } else if (process.platform === "darwin") {
            var addonDir = path.join(gameS[addon.gameVersion].installPath, gameVersions[addon.gameVersion].macAddonDir);
        }
        // World of Warcraft

        if (!fs.existsSync(addonDir)) {
            try {
                fs.mkdirSync(addonDir, { recursive: true });
            } catch (err) {
                reject({ 'err': 'Addon Directory Does Not Exist' });
            }   
        }
        let tempDir = path.join(app.getPath("temp"),'/singularity');

        download(win, addon.downloadUrl, {directory: tempDir})
            .then(dItem => {
                var savePath = dItem.getSavePath();
                extract(savePath, { dir: addonDir })
                    .then(() => {
                        if (fs.existsSync(savePath)) {
                            fs.unlink(savePath, (err) => {
                                if (err) {
                                    log.error(err);
                                    reject(err);
                                }
                                resolve('success');
                            });
                        } else {
                            resolve('success');
                        }                
                    })
                    .catch(err => {
                        log.error(err);
                        reject('Error extracting addon from addon sync')
                    });            
            })
            .catch(err => {
                log.error(err);
                reject('Error downloading adddon from addon sync');
            })
    });
}


function autoUpdateAddon(updateObj) {
    return new Promise((resolve, reject) => {
        
        let gameS = storageService.getGameSettings(updateObj.gameId.toString());
        let gameVersions = storageService.getGameData(updateObj.gameId.toString()).gameVersions;
        if (process.platform === "win32") {
            var addonDir = path.join(gameS[updateObj.gameVersion].installPath, gameVersions[updateObj.gameVersion].addonDir);
        } else if (process.platform === "darwin") {
            var addonDir = path.join(gameS[updateObj.gameVersion].installPath, gameVersions[updateObj.gameVersion].macAddonDir);
        }
        log.info('Updating addon '+updateObj.addon.addonName);
        updateAddon(updateObj.gameId, addonDir, updateObj.addon, updateObj.latestFile)
        .then (result => {
            let addon = updateObj.addon;
            addon.fileName = updateObj.latestFile.fileName;
            addon.fileDate = updateObj.latestFile.fileDate;
            addon.releaseType = updateObj.latestFile.releaseType;
            addon.gameVersion = updateObj.latestFile.gameVersion[0];
            addon.modules = updateObj.latestFile.modules;
            addon.installedFile = updateObj.latestFile;
            addon.updateAvailable = false;
            addon.updateFile = {};
            addon.brokenInstallation = false;

            let installedAddons = gameS[updateObj.gameVersion].installedAddons.filter(obj => {
                return obj.addonId !== updateObj.addon.addonId;
            })
            updateObj.addon.installedFile = updateObj.latestFile
            installedAddons.push(addon);
            gameS[updateObj.gameVersion].installedAddons = installedAddons;

            storageService.setGameSettings(updateObj.gameId.toString(), gameS);
            resolve();
        }) 
        .catch(err => {
            reject(err);
        })
    })
}

function updateAddon(gameId, addonDir, addon, latestFile) {
    return new Promise((resolve, reject) => {
        if (gameId == 1) {
            // World of Warcraft

            if (!fs.existsSync(addonDir)) {
                try {
                    fs.mkdirSync(addonDir, { recursive: true });
                } catch (err) {
                    reject({ 'err': 'Addon Directory Does Not Exist' });
                }   
            }
            let tempDir = path.join(app.getPath("temp"),'/singularity');

            const win = BrowserWindow.fromId(browserWindowId);

            download(win, latestFile.downloadUrl, {directory: tempDir})
                .then(dItem => {
                    var savePath = dItem.getSavePath();
                    extract(savePath, { dir: addonDir })
                        .then(() => {
                            if (fs.existsSync(savePath)) {
                                fs.unlink(savePath, (err) => {
                                    if (err) {
                                        log.error(err);
                                        reject(err);
                                    }
                                    resolve('success');
                                });
                            } else {
                                resolve('success');
                            }                
                        })
                        .catch(err => {
                            log.error(err);
                            reject('Error extracting addon update')
                        });            
                })
                .catch(err => {
                    log.error(err);
                    reject('Error downloading adddon update');
                })
        }
    });
}

function restoreWoWAddonFile(addon) {
    return new Promise((resolve, reject) => {
        log.info('Restoring addon backup for '+addon.addonName);
        const win = BrowserWindow.fromId(browserWindowId);
        win.webContents.send('restore-status','Restoring: '+addon.addonName);
        let gameS = storageService.getGameSettings('1');
        let gameVersions = storageService.getGameData('1').gameVersions;

        if (process.platform === "win32") {
            var addonDir = path.join(gameS[addon.gameVersion].installPath, gameVersions[addon.gameVersion].addonDir);
        } else if (process.platform === "darwin") {
            var addonDir = path.join(gameS[addon.gameVersion].installPath, gameVersions[addon.gameVersion].macAddonDir);
        }
        // World of Warcraft

        if (!fs.existsSync(addonDir)) {
            try {
                fs.mkdirSync(addonDir, { recursive: true });
            } catch (err) {
                reject({ 'err': 'Addon Directory Does Not Exist' });
            }   
        }
        let tempDir = path.join(app.getPath("temp"),'/singularity');

       

        download(win, addon.downloadUrl, {directory: tempDir})
            .then(dItem => {
                var savePath = dItem.getSavePath();
                extract(savePath, { dir: addonDir })
                    .then(() => {
                        if (fs.existsSync(savePath)) {
                            fs.unlink(savePath, (err) => {
                                if (err) {
                                    log.error(err);
                                    reject(err);
                                }
                                resolve('success');
                            });
                        } else {
                            resolve('success');
                        }                
                    })
                    .catch(err => {
                        log.error(err);
                        reject('Error extracting addon backup')
                    });            
            })
            .catch(err => {
                log.error(err);
                reject('Error downloading adddon backup');
            })
    });
}

function deleteLocalBackup(backup) {
    return new Promise( (resolve, reject) => {
        storageService.deleteBackupInfo(backup.gameId.toString(),backup.gameVersion,backup)
        .then(() => {
            resolve();
        })
        .catch(err => {
            reject('Error deleting backup data');
        })
    })
}

function restoreGranularBackup(backup, includeSettings) {   
    return new Promise( (resolve, reject) => {
        let gameS = storageService.getGameSettings(backup.gameId.toString());
        let gameVersions = storageService.getGameData(backup.gameId.toString()).gameVersions;
        let installPath = gameS[backup.gameVersion].installPath;
        let settingsPath = path.join(installPath, 'WTF');

        if (gameS[backup.gameVersion].sync) {
            log.info('Addon sync is enabled, disabling before restoring backup');
            gameS[backup.gameVersion].sync = false;
            storageService.setGameSettings(backup.gameId.toString(),gameS);
        }

        if (!fs.existsSync(settingsPath)) {
            reject({ 'err': "Settings directory doesn't exist" })
        }

        let tempDir = path.join(app.getPath("temp"), '/singularity');
        let win = BrowserWindow.fromId(browserWindowId);

        win.webContents.send('restore-status','Restoring Addons');

        cloudAddonsToRestore = [];
        backup.addons.forEach(a => {
            a.gameVersion = backup.gameVersion
            cloudAddonsToRestore.push(a);
        })

        cloudAddonsLeft = cloudAddonsToRestore.length;
        var pool = new PromisePool(restorePromiseProducer, 1)
        pool.start()
        .then (() => {
            log.info('All addons restored');
            return ''
            //resolve('success');
        })
        .then(() => {
            if (!includeSettings) {
                log.info('User did not opt to restore settings');
                resolve('success');
            } else {
                if (backup.cloud) {
                    win.webContents.send('restore-status','Downloading Settings Backup');
                    log.info('Downloading settings from the cloud');
                    return download(win, backup.settings, { directory: tempDir })
                    .then(dItem => {
                        log.info('Settings file downloaded');
                        var savePath = dItem.getSavePath();
                        extract(savePath, { dir: settingsPath })
                        .then(() => {
                            log.info('Settings file extracted');
                            if (fs.existsSync(savePath)) {
                                fsPromises.unlink(savePath)
                            } else {
                                
                                return ''
                            }
                        })
                    })
                } else {
                    win.webContents.send('restore-status','Unpacking Local Settings Backup');
                    log.info('Grabbing settings file from backup');
                    let tmpFilePath = path.join(tempDir, 'tempsettings.zip')
                    fsPromises.writeFile(tmpFilePath, backup.file, 'base64')
                    .then(() => {
                        extract(tmpFilePath, { dir: settingsPath })
                        .then(() => {
                            log.info('Settings file extracted');
                            if (fs.existsSync(tmpFilePath)) {
                                fsPromises.unlink(tmpFilePath)
                            } else {
                                return ''
                            }
                        })
                    })
                }
            }
            
        })
        .then(() => {
            log.info('Done restoring backup!');
            return resolve('success');
        })
        .catch(err => {
            log.error(err);
            reject('Error restoring backup');
        })
    })
}

function syncFromProfile(profile) {   
    return new Promise( (resolve, reject) => {
        log.info('Handling sync for '+profile.gameVersion)
        let gameS = storageService.getGameSettings(profile.gameId.toString());
        let installedAddons = gameS[profile.gameVersion].installedAddons;

        let win = BrowserWindow.fromId(browserWindowId);
        win.webContents.send('sync-status',profile.gameId, profile.gameVersion,'sync-started',null, null);

        installedAddons.forEach(addon => {
            
            let profileMatch = profile.addons.find( a => {
                return a.addonId == addon.addonId
            })
            if (!profileMatch) {
                addon.gameId = profile.gameId;
                addon.gameVersion = profile.gameVersion;
                log.info('Addon '+addon.addonName+' not in sync profile, add to remove list');
                syncedAddonsToRemove.push(addon)
            } else {
                if (addon.installedFile.fileId !== profileMatch.fileId) {
                    log.info('Addon '+addon.addonName+' needs to be updated from profile, add to list');
                    profileMatch.gameVersion = profile.gameVersion;
                    profileMatch.gameId = profile.gameId;
                    syncedAddonsToInstall.push(profileMatch)
                }
            } 
        })
        win.webContents.send('sync-status',profile.gameId, profile.gameVersion,'handling-addons', null, null);
        var pool = new PromisePool(installAddonFromSyncProducer, 1)
        pool.start()
        .then (() => {
            log.info('All addons updated/installed from sync profile');
            return ''
            //resolve('success');
        })
        .then(() => {
            win.webContents.send('sync-status',profile.gameId, profile.gameVersion,'deleting-unsynced-addons', null, null);
            var removePool = new PromisePool(unInstallAddonFromSyncProducer, 3)
            return removePool.start()       
        })
        .then(() => {
            log.info('Done syncing from profile!');
            win.webContents.send('sync-status',profile.gameId, profile.gameVersion,'complete', new Date(), null);
            return resolve('success');
        })
        .catch(err => {
            log.error(err);
            reject('Error syncing from profile');
        })
    })
}

function uninstallAddonFromSync(addon) {
    return new Promise((resolve, reject) => {
        let gameS = storageService.getGameSettings(addon.gameId.toString());
        let gameVersions = storageService.getGameData(addon.gameId.toString()).gameVersions;

        if (process.platform === "win32") {
            var addonDir = path.join(gameS[addon.gameVersion].installPath, gameVersions[addon.gameVersion].addonDir);
        } else if (process.platform === "darwin") {
            var addonDir = path.join(gameS[addon.gameVersion].installPath, gameVersions[addon.gameVersion].macAddonDir);
        }

        if (!fs.existsSync(addonDir)) {
            reject({ 'err': 'Addon Directory Does Not Exist' });
        }

        var promises = [];
        for (var d in addon.modules) {
            promises.push(uninstallDir(addonDir, addon.modules[d].folderName));
        }
        Promise.allSettled(promises)
            .then( () => {
                resolve('success');
            })
            .catch((e) => {
                log.error(e);
            })
    });
}

function uninstallAddon(gameId, addonDir, addon) {
    return new Promise((resolve, reject) => {
        if (gameId == 1) {
            // World of Warcraft

            if (!fs.existsSync(addonDir)) {
                reject({ 'err': 'Addon Directory Does Not Exist' });
            }

            var promises = [];
            for (var d in addon.modules) {
                promises.push(uninstallDir(addonDir, addon.modules[d].folderName));
            }
            Promise.allSettled(promises)
                .then( () => {
                    resolve('success');
                })
                .catch((e) => {
                    log.error(e);
                })
        }
    });
}



function createGranularBackupObj(gameId, gameVersion) {
    return new Promise( (resolve, reject) => {
        let gameS = storageService.getGameSettings(gameId.toString());
        let installPath = gameS[gameVersion].installPath;
        let settingsPath = path.join(installPath, 'WTF');
        let installedAddons = gameS[gameVersion].installedAddons;
        let addonBackup = []
        installedAddons.forEach( addon => {
            addonBackup.push(
                {
                    addonId: addon.addonId,
                    addonName: addon.addonName,
                    fileId: addon.installedFile.fileId,
                    fileName: addon.installedFile.fileName,
                    fileDate: addon.installedFile.fileDate,
                    downloadUrl: addon.installedFile.downloadUrl,
                    releaseType: addon.installedFile.releaseType,
                    gameVersion: addon.installedFile.gameVersion
                }
            )
        })

        if (!fs.existsSync(settingsPath)) {
            reject({ 'err': "Settings directory doesn't exist" })
        }
        let outputStreamBuffer = new streamBuffers.WritableStreamBuffer({
            initialSize: (1000 * 1024),   // start at 1000 kilobytes.
            incrementAmount: (1000 * 1024) // grow by 1000 kilobytes each time buffer overflows.
        });

        let archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                log.error(err);
            } else {
                // throw error
                log.error(err);
                reject({ 'err': err})
            }
        });

        archive.on('error', function (err) {
            log.error(err);
            reject({ 'err': err })
        });

        outputStreamBuffer.on('finish', () => {
            let buff = outputStreamBuffer.getContents();
            resolve({
                encodedFile: buff.toString('base64'),
                addons: addonBackup})
        })

        archive.pipe(outputStreamBuffer);
        archive.directory(settingsPath, false);
        archive.finalize();

    })
}

function backupAddonSettings(gameId, gameVersion, settingsDir, backupDir) {
    return new Promise((resolve, reject) => {

        if (gameId == 1) {
            // World of Warcraft

            if (!fs.existsSync(settingsDir)) {
                reject({ 'err': "Settings directory doesn't exist" })
            }
            const destinationPath = path.join(backupDir, 'backup', gameId.toString(), gameVersion);

            if (!fs.existsSync(destinationPath)) {
                try {
                    fs.mkdirSync(destinationPath, { recursive: true });
                } catch (err) {
                    reject({ 'err': 'Unable to create backup directory' });
                }   
            }
            const output = fs.createWriteStream(destinationPath + '/settings.zip');
            const archive = archiver('zip', {
                zlib: { level: 9 }
            });
            output.on('close', function () {
                resolve({});
            });

            archive.on('warning', function (err) {
                if (err.code === 'ENOENT') {
                    log.error(err);
                } else {
                    // throw error
                    log.error(err);
                    reject({ 'err': err})
                }
            });

            archive.on('error', function (err) {
                log.error(err);
                reject({ 'err': err })
            });

            archive.pipe(output);

            archive.directory(settingsDir, false);
            archive.finalize();

        } else {
            reject({ 'err': "Unknown game ID" });
        }
    });
}

function restoreAddonSettings(gameId, gameVersion, settingsDir, backupDir) {
    return new Promise((resolve, reject) => {

        if (gameId == 1) {
            // World of Warcraft

            if (!fs.existsSync(settingsDir)) {
                reject({ 'err': "Settings directory doesn't exist" })
            }
            const backupPath = path.join(backupDir, 'backup', gameId.toString(), gameVersion, 'settings.zip');

            if (!fs.existsSync(backupPath)) {
                reject({ 'err': "Settings backup doesn't exist" })
            }

            extract(backupPath, { dir: settingsDir })
                .then(() => {
                    resolve({})
                }).catch(err => {
                    reject({ 'err': err })
                })
        } else {
            reject({ 'err': "Unknown game ID" });
        }
    });
}

function backupAddons(gameId, gameVersion, addonDir, backupDir) {
    return new Promise((resolve, reject) => {

        if (gameId == 1) {
            // World of Warcraft

            if (!fs.existsSync(addonDir)) {
                reject({ 'err': "Addon directory doesn't exist" })
            }
            const destinationPath = path.join(backupDir, 'backup', gameId.toString(), gameVersion);

            if (!fs.existsSync(destinationPath)) {
                try {
                    fs.mkdirSync(destinationPath, { recursive: true });
                } catch (err) {
                    reject({ 'err': 'Unable to create backup directory' });
                }
            }

            const dstFile = path.join(destinationPath, 'addons.zip');

            if (fs.existsSync(dstFile)) {
                fs.unlink(dstFile, (err) => {
                    if (err) {
                        log.error(err);
                        reject(err);
                    }
                    const output = fs.createWriteStream(dstFile);
                    const archive = archiver('zip', {
                        zlib: { level: 9 }
                    });
                    output.on('close', function () {
                        log.info('Addon Backup Complete');
                        resolve({});
                    });

                    archive.on('warning', function (err) {
                        if (err.code === 'ENOENT') {
                            log.error(err);
                        } else {
                            // throw error
                            log.error(err);
                            reject({ 'err': err })
                        }
                    });

                    archive.on('error', function (err) {
                        log.error(err);
                        reject({ 'err': err })
                    });

                    archive.pipe(output);
                    log.info('Addon Backup Started');
                    archive.directory(addonDir, false);
                    archive.finalize();

                });
            } else {
                const output = fs.createWriteStream(dstFile);
                const archive = archiver('zip', {
                    zlib: { level: 9 }
                });
                output.on('close', function () {
                    log.info('Addon Backup Complete');
                    resolve({});
                });

                archive.on('warning', function (err) {
                    if (err.code === 'ENOENT') {
                        log.error(err);
                    } else {
                        // throw error
                        log.error(err);
                        reject({ 'err': err })
                    }
                });

                archive.on('error', function (err) {
                    log.error(err);
                    reject({ 'err': err })
                });

                archive.pipe(output);
                log.info('Addon Backup Started');
                archive.directory(addonDir, false);
                archive.finalize();
            }

        } else {
            reject({ 'err': "Unknown game ID" });
        }
    });
}

function restoreAddons(gameId, gameVersion, addonDir, backupDir) {
    return new Promise((resolve, reject) => {

        if (gameId == 1) {
            // World of Warcraft

            if (!fs.existsSync(addonDir)) {
                reject({ 'err': "Addon directory doesn't exist" })
            }
            const backupPath = path.join(backupDir, 'backup', gameId.toString(), gameVersion, 'addons.zip');


            if (!fs.existsSync(backupPath)) {
                reject({ 'err': "Addon backup directory doesn't exist" })
            }

            extract(backupPath, { dir: addonDir })
                .then(() => {
                    resolve({})
                }).catch(err => {
                    reject({ 'err': err })
                })

        } else {
            reject({ 'err': "Unknown game ID" });
        }
    });
}

function findAddonDirectories(gameId, installDir, addonDir) {
    return new Promise((resolve, reject) => {
        if (gameId == 1) {
            // World of Warcraft
            let p = path.join(installDir, addonDir);
            if (!fs.existsSync(p)) {
                reject({ 'errType':'noDir', 'errMsg':'Addon directory does not exist'});
            } else {
                fs.promises.readdir(p, { withFileTypes: true })
                    .then(files => {
                        resolve(files.filter(e => e.isDirectory())
                            .map(e => e.name));
                    })
                    .catch(err => {
                        log.error(err);
                        reject({'errType':'unkown', 'errMsg': 'Unexpected error while reading directory'})
                    })
            }
        }
    })
}

function fingerprintAllAsync(gameId, installDir, addonDir) {
    return new Promise((resolve, reject) => {
        if (gameId == 1) {
            // World of Warcraft
            let p = path.join(installDir, addonDir);
            if (!fs.existsSync(p)) {
                resolve({});
            } else {
                fs.promises.readdir(p, { withFileTypes: true })
                    .then(files => {
                        return files.filter(dirent => dirent.isDirectory())
                            .map(dirent => dirent.name);
                    }).then(addonDirs => {
                        var promises = [];
                        for (const d of addonDirs) {
                            promises.push(readAddonDir(p, d));

                        }
                        Promise.allSettled(promises)
                            .then(results => {
                                let addonHashMap = {};
                                results.forEach(result => {
                                    if (result.status == 'fulfilled') {
                                        addonHashMap[result.value.d] = result.value.hash
                                    }
                                })
                                resolve(addonHashMap);
                            })
                            .catch((e) => {
                                log.error(e);
                            })

                    })
                    .catch(err => {
                        log.error(err);
                        resolve({})
                    })
            }
        }

    });
}

function findAddonsForGameVersion(gameId, gameVersion) {
    return new Promise((resolve, reject) => {
        log.info('Finding addons for '+gameVersion);
        let gameS = storageService.getGameSettings(gameId.toString());
        let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
        let addonVersion = gameVersions[gameVersion].addonVersion;
        let addonDir = (process.platform === "win32") ? gameVersions[gameVersion].addonDir : (process.platform === 'darwin') ? gameVersions[gameVersion].macAddonDir : ''
        fingerprintAllAsync(gameId, gameS[gameVersion].installPath, addonDir)
            .then(hashMap => {
            return identifyAddons(gameId.toString(), gameVersion, hashMap)
        })
        .then(result => {
            log.info('Checking for addons that are configured to auto update');
            let toUpdate = [];
            if (result.addons.length > 0) {
                result.addons.forEach(addon => {
                    if (addon.updateAvailable && addon.autoUpdate && !addon.ignoreUpdate) {
           
                        let possibleFiles = addon.latestFiles.filter((file) => {
                            return (file.releaseType <= addon.trackBranch && file.gameVersionFlavor == addonVersion);
                        });
                        if (possibleFiles && possibleFiles.length > 0) {
                            let latestFile = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
                            if (latestFile.fileDate > addon.installedFile.fileDate) {
                                toUpdate.push({gameId: gameId, gameVersion: gameVersion, addon: addon, latestFile: latestFile});
                            }
                        }
                        
                    }
                })
            }
            return resolve({toUpdate: toUpdate})
        })
        .catch(err => {
            return reject(err);
        })
    })
}

// For each game and game version, fingerprint the installed addons and
// pass them to the identifyAddons function to identify them.
function findAndUpdateAddons() {
    return new Promise( (resolve, reject) => {
        log.info('Checking for installed addons');
        var gameId = 1;
        let gameS = storageService.getGameSettings(gameId.toString());
        var promises = [];
        let gameVersions = [];
        let needsSyncProfileUpdate = new Set();

        for (const [key, value] of Object.entries(gameS)) {
            var gameVersion = key;
            gameVersions.push(key);
            promises.push(findAddonsForGameVersion(gameId, gameVersion))
        }
        Promise.allSettled(promises)
        .then(results => {
            let toUpdate = []
            results.forEach( result => {
                if (result.status == 'fulfilled') {
                    result.value.toUpdate.forEach(addon => {
                        if (gameS[addon.gameVersion].sync){
                            needsSyncProfileUpdate.add({gameId: addon.gameId, gameVersion: addon.gameVersion});
                        }
                        autoUpdateAddonsLeft.push(addon);
                        toUpdate.push(addon);
                    })
                }
            })
            let autoUpdatePool = new PromisePool(autoUpdateAddonProducer, 1)
            return autoUpdatePool.start()
            .then (() => {
                log.info('Finished updating addons');
                let win = BrowserWindow.fromId(browserWindowId);
                win.webContents.send('addon-autoupdate-complete');
                return resolve(needsSyncProfileUpdate)
            })

        })
        .catch((e) => {
            log.error(e);
            return reject('Error while identifying addons and checking for updates')
        })
    })
}

// For a given game ID and version, take in an object containing directories
// and fingerprints and attempt to identify the installed addons via the api
function identifyAddons(gameId, gameVersion, hashMap) {
    return new Promise((resolve, reject) => {
        let gameS = storageService.getGameSettings(gameId.toString());
        let gameVersions = storageService.getGameData(gameId.toString()).gameVersions;
        let addonVersion = gameVersions[gameVersion].addonVersion;
        let win = BrowserWindow.fromId(browserWindowId);
        var hashes = [];
        for (var k in hashMap) {
            hashes.push(hashMap[k])
        }
        log.info('Submitting addon identification request for '+gameVersion);
        const postData = JSON.stringify({ 'fingerprints': hashes });
        const request = net.request({
            method: 'POST',
            url: apiEndpoint + 'addons/fingerprint'
        });
        request.setHeader('x-app-uuid', storageService.getAppData('UUID'));
        request.setHeader('x-app-platform', process.platform);
        let body = ''
        request.on('error', (error) => {
            log.error('Error while identifying addons for '+gameVersion);
            log.error(error);
            win.webContents.send('no-addons-found', gameVersion);
            reject({});
        });
        request.on('response', (response) => {
            if (response.statusCode == 404) {
                log.info('Received 404 response when identifying addons for for '+gameVersion);
                var currentlyInstalledAddons = gameS[gameVersion].installedAddons;
                var identifiedAddons = [];
                var unknownDirs = [];
                var identifiedDirs = [];
                for (var key in hashMap) {
                    if (!identifiedDirs.includes(key)) {
                        unknownDirs.push(key)
                    }
                }

                if (unknownDirs.length > 0) {
                        currentlyInstalledAddons.forEach((addon) => {
                            let addonDirs = [];
                            addon.modules.forEach((module) => {
                                addonDirs.push(module.folderName);
                            })
                            if (addonDirs.every(v => unknownDirs.includes(v))) {
                                addon.unknownUpdate = true;
                                if (!identifiedAddons.some(e => e.addonId === addon.addonId)) {
                                    log.info('Unknown update installed for addon ' + addon.addonName);
                                    identifiedAddons.push(addon);
                                }
                            } else if (addonDirs.some(v => unknownDirs.includes(v))) {
                                addon.brokenInstallation = true;
                                if (!identifiedAddons.some(e => e.addonId === addon.addonId)) {
                                    log.info('Potentially broken installation for addon ' + addon.addonName);
                                    identifiedAddons.push(addon);
                                }
                            }
                        })
                    }

                gameS[gameVersion].installedAddons = identifiedAddons;
                gameS[gameVersion].unknownAddonDirs = unknownDirs;
                storageService.setGameSettings(gameId.toString(), gameS);
                win.webContents.send('no-addons-found', gameVersion);
                resolve({'gameId': gameId, 'gameVersion': gameVersion, 'addons': identifiedAddons })
            } else {
                response.on('data', (chunk) => {
                    body += chunk.toString()
                })
                response.on('end', () => {
                    if (body) {
                        log.info('Received data in response when identifying addons for for '+gameVersion);
                        var addons = JSON.parse(body);
                        var currentlyInstalledAddons = gameS[gameVersion].installedAddons;
                        var knownDirs = [];

                        var identifiedAddons = [];
                        var unknownDirs = [];
                        var identifiedDirs = [];
                        var unknownUpdates = [];
                        var brokenInstallations = [];

                        if (addons && addons.length > 0) {
                            log.info('At least one addon identified for '+gameVersion);
                            addons.forEach((addon) => {
                                var installedVersion = currentlyInstalledAddons.find( (a) => {
                                    return a.addonId === addon.addonId
                                });
                                if (installedVersion) {
                                    addon.trackBranch = installedVersion.trackBranch || 1;
                                    addon.autoUpdate = installedVersion.autoUpdate || false;
                                    addon.ignoreUpdate = installedVersion.ignoreUpdate || false;
                                } else {
                                    addon.trackBranch = 1;
                                    addon.autoUpdate = false;
                                    addon.ignoreUpdate = false;
                                }
 
                                addon.updateAvailable = false;
                                addon.updateFile = {};

                                addon.unknownUpdate = false;
                                addon.brokenInstallation = false;
                                let possibleFiles = addon.latestFiles.filter((file) => {
                                    return (file.releaseType <= addon.trackBranch && file.gameVersionFlavor == addonVersion);
                                });
                                if (possibleFiles && possibleFiles.length > 0) {
                                    let latestFile = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
                                    if (latestFile.fileDate > addon.installedFile.fileDate) {
                                        addon.updateAvailable = true;
                                        addon.updateFile = latestFile;
                                    }
                                } 

                                identifiedAddons.push(addon);
                                if (addon.modules && addon.modules.length > 0) {
                                    addon.modules.forEach((module) => {
                                        identifiedDirs.push(module.folderName);
                                    });
                                }

                            });
                            for (var key in hashMap) {
                                if (!identifiedDirs.includes(key)) {
                                    unknownDirs.push(key)
                                }
                            }


                            if (unknownDirs.length > 0) {
                                currentlyInstalledAddons.forEach((addon) => {
                                    let addonDirs = [];
                                    addon.modules.forEach((module) => {
                                        addonDirs.push(module.folderName);
                                    })
                                    if (addonDirs.every(v => unknownDirs.includes(v))) {
                                        addon.unknownUpdate = true;
                                        if (!identifiedAddons.some(e => e.addonId === addon.addonId)) {
                                            log.info('Unknown update installed for addon ' + addon.addonName);
                                            identifiedAddons.push(addon);
                                        }
                                    } else if (addonDirs.some(v => unknownDirs.includes(v))) {
                                        addon.brokenInstallation = true;
                                        if (!identifiedAddons.some(e => e.addonId === addon.addonId)) {
                                            log.info('Potentially broken installation for addon ' + addon.addonName);
                                            identifiedAddons.push(addon);
                                        }
                                    }
                                })
                            }
                            
                            gameS[gameVersion].installedAddons = identifiedAddons;
                            gameS[gameVersion].unknownAddonDirs = unknownDirs;
                            storageService.setGameSettings(gameId.toString(), gameS);
                            log.info(gameVersion+' - '+identifiedAddons.length+' addons installed & '+unknownDirs.length+' directories unknown');
                            win.webContents.send('addons-found', identifiedAddons, gameVersion);
                            resolve({'gameId': gameId, 'gameVersion':gameVersion, 'addons':identifiedAddons });
                        } else {
                            log.info('No addon identified for '+gameVersion);
                            for (var key in hashMap) {
                                if (!identifiedDirs.includes(key)) {
                                    unknownDirs.push(key)
                                }
                            }
                            var identifiedAddons = [];
                            
                            if (unknownDirs.length > 0) {
                                currentlyInstalledAddons.forEach((addon) => {
                                    let addonDirs = [];
                                    addon.modules.forEach((module) => {
                                        addonDirs.push(module.folderName);
                                    })
                                    if (addonDirs.every(v => unknownDirs.includes(v))) {
                                        addon.unknownUpdate = true;
                                        if (!identifiedAddons.some(e => e.addonId === addon.addonId)) {
                                            log.info('Unknown update installed for addon ' + addon.addonName);
                                            identifiedAddons.push(addon);
                                        }
                                    } else if (addonDirs.some(v => unknownDirs.includes(v))) {
                                        addon.brokenInstallation = true;
                                        if (!identifiedAddons.some(e => e.addonId === addon.addonId)) {
                                            log.info('Potentially broken installation for addon ' + addon.addonName);
                                            identifiedAddons.push(addon);
                                        }
                                    }
                                })
                            }


                            gameS[gameVersion].installedAddons = identifiedAddons;
                            gameS[gameVersion].unknownAddonDirs = unknownDirs;
                            storageService.setGameSettings(gameId.toString(), gameS);
                            log.info(gameVersion+' - '+identifiedAddons.length+' addons installed & '+unknownDirs.length+' directories unknown');
                            win.webContents.send('no-addons-found', gameVersion);
                            resolve({'gameId': gameId,'gameVersion': gameVersion, 'addons': identifiedAddons })
                        }
                    } else {
                        log.info('Received no data in response when identifying addons for for '+gameVersion);
                        var currentlyInstalledAddons = gameS[gameVersion].installedAddons;
                        var identifiedAddons = [];
                        var unknownDirs = [];
                        var identifiedDirs = [];

                        for (var key in hashMap) {
                            if (!identifiedDirs.includes(key)) {
                                unknownDirs.push(key)
                            }
                        }
                        var identifiedAddons = [];
                        if (unknownDirs.length > 0) {
                                currentlyInstalledAddons.forEach((addon) => {
                                    let addonDirs = [];
                                    addon.modules.forEach((module) => {
                                        addonDirs.push(module.folderName);
                                    })
                                    if (addonDirs.every(v => unknownDirs.includes(v))) {
                                        addon.unknownUpdate = true;
                                        if (!identifiedAddons.some(e => e.addonId === addon.addonId)) {
                                            log.info('Unkown update installed for addon ' + addon.addonName);
                                            identifiedAddons.push(addon);
                                        }
                                    } else if (addonDirs.some(v => unknownDirs.includes(v))) {
                                        addon.brokenInstallation = true;
                                        if (!identifiedAddons.some(e => e.addonId === addon.addonId)) {
                                            log.info('Potentially broken installation for addon ' + addon.addonName);
                                            identifiedAddons.push(addon);
                                        }
                                    }
                                })
                            }

                        gameS[gameVersion].installedAddons = identifiedAddons;
                        gameS[gameVersion].unknownAddonDirs = unknownDirs;
                        storageService.setGameSettings(gameID.toString(), gameS);
                        log.info(gameVersion+' - '+identifiedAddons.length+' addons installed & '+unknownDirs.length+' directories unknown');
                        win.webContents.send('no-addons-found', gameVersion);
                        resolve({'gameId': gameId, 'gameVersion': gameVersion, 'addons': identifiedAddons })
                    }
                });
            }
        });
        request.write(postData);
        request.end();
    })
}

// For the sepected path, attempt to find any installed WoW versions in either the path root or for each game version directory
function findInstalledWoWVersions(selectedPath)  {
    let gameVersions = storageService.getGameData('1').gameVersions;
    var installedVersions = [];
    for (var gameVersion in gameVersions) {
        if (process.platform === "win32") {
            let exePath = path.join(selectedPath, gameVersions[gameVersion].executable);
            let flavorString = gameVersions[gameVersion].flavorString;
    
            if (fs.existsSync(exePath)) {
                // Identify version
                let flavorFile = path.join(selectedPath, '.flavor.info');
                if (fs.existsSync(flavorFile)) {
                    var text = fs.readFileSync(flavorFile).toString('utf-8').split('\n');
                    if (text[1] == flavorString) {
                        installedVersions.push(gameVersion);
                    }
                }
            } else {
                switch (gameVersion) {
                    case 'wow_retail':
                        var p = path.join(selectedPath, '_retail_', gameVersions[gameVersion].executable);
                        var f = path.join(selectedPath, '_retail_', '.flavor.info');
                        break;
                    case 'wow_classic':
                        var p = path.join(selectedPath, '_classic_', gameVersions[gameVersion].executable);
                        var f = path.join(selectedPath, '_classic_', '.flavor.info');
                        break;
                    case 'wow_retail_ptr':
                        var p = path.join(selectedPath, '_ptr_', gameVersions[gameVersion].executable);
                        var f = path.join(selectedPath, '_ptr_', '.flavor.info');
                        break;
                    case 'wow_classic_ptr':
                        var p = path.join(selectedPath, '_classic_ptr_', gameVersions[gameVersion].executable);
                        var f = path.join(selectedPath, '_classic_ptr_', '.flavor.info');
                        break;
                    case 'wow_retail_beta':
                        var p = path.join(selectedPath, '_beta_', gameVersions[gameVersion].executable);
                        var f = path.join(selectedPath, '_beta_', '.flavor.info');
                        break;
                }
                if (fs.existsSync(p)) {
                    if (fs.existsSync(f)) {
                        var text = fs.readFileSync(f).toString('utf-8').split('\n');
                        if (text[1] == flavorString) {
                            installedVersions.push(gameVersion);
                        }
                    }
                }
    
            }
        } else if (process.platform === "darwin") {
            let exePath = path.join(selectedPath, gameVersions[gameVersion].macExecutable);
            if (fs.existsSync(exePath)) {
                if (exePath.includes(gameVersions[gameVersion].macFlavorString)) {
                    installedVersions.push(gameVersion); 
                } 
            } else {
                switch (gameVersion) {
                    case 'wow_retail':
                        var p = path.join(selectedPath, '_retail_', gameVersions[gameVersion].macExecutable);
                        break;
                    case 'wow_classic':
                        var p = path.join(selectedPath, '_classic_', gameVersions[gameVersion].macExecutable);
                        break;
                    case 'wow_retail_ptr':
                        var p = path.join(selectedPath, '_ptr_', gameVersions[gameVersion].macExecutable);
                        break;
                    case 'wow_classic_ptr':
                        var p = path.join(selectedPath, '_classic_ptr_', gameVersions[gameVersion].macExecutable);
                        break;
                    case 'wow_retail_beta':
                        var p = path.join(selectedPath, '_beta_', gameVersions[gameVersion].macExecutable);
                        break;
                }
                if (fs.existsSync(p)) {
                    installedVersions.push(gameVersion);
                }
            }
        }
    }
    return installedVersions;
}

// Check for and install addons at the user-configured interval.
// Default to every hour.
function setAddonUpdateInterval() {
    let appD = storageService.getAppData('userConfigurable');
    let checkInterval = 1000 * 60 * 60;
    if (appD.addonUpdateInterval) {
        switch (appD.addonUpdateInterval) {
            case '15m':
                checkInterval = 1000 * 60 * 15;
                break;
            case '30m':
                checkInterval = 1000 * 60 * 30;
                break;
            case '1h':
                checkInterval = 1000 * 60 * 60;
                break;
            case '3h':
                checkInterval = 1000 * 60 * 60 * 3;
                break;
            default:
                checkInterval = 1000 * 60 * 60;
        }
    } else {
        appD.addonUpdateInterval = '1h';
        storageService.setAppData('userConfigurable', appD);
        checkInterval = 1000 * 60 * 60;
    }
    log.info('Addon update interval set to: ' + appD.addonUpdateInterval);
    updateInterval = setInterval(() => {
        //checkAddons();
        findAndUpdateAddons()
        .then( profiles => {
            syncService.updateSyncProfiles([...profiles]);
         })
         .catch(error => {
             log.error('Error while auto-udpating addons');
         })
    }, checkInterval);
}

/*
 * None export helper functions
 */
function uninstallDir(p, d) {
    return new Promise((resolve, reject) => {
        if (d != '/' && d != '\\') {
            let directory = path.join(p, d);
            if (fs.existsSync(directory)) {
                fs.rmdir(directory, { recursive: true }, (err) => {
                    if (err) {
                        log.error(err);
                        reject(err);
                    }
                    resolve();
                });
            }
        } else {
            resolve();
        }       
    })
}

function readAddonDir(p,d) {
    return new Promise((resolve, reject) => {
        var tocFile;
        var addonFileHashes = [];
        try {
            var addonDir = path.join(p, d);
        } catch (err) {
            reject(err);
        }
        fs.promises.readdir(addonDir)
            .then(addonFiles => {
                for (var i = 0; i < addonFiles.length; i++) {
                    var filename = path.join(addonDir, addonFiles[i]);

                    if (filename.indexOf('.toc') >= 0) {
                        tocFile = filename;
                        addonFileHashes.push(hasha.fromFileSync(tocFile, { algorithm: 'md5' }));
                        break;
                    };
                };
                return fs.readFileSync(tocFile).toString('utf-8').split('\n');
                
            })
            .then(tocFileText => {
                for (var line of tocFileText) {
                    if (line.trim().charAt(0) != '#' && line.trim().length > 0) {
                        if (process.platform === "darwin") {
                            line = line.replace(/\\/g, "/"); 
                        }
                        try {
                            addonFileHashes.push(hasha.fromFileSync(path.join(addonDir, line.trim()), { algorithm: 'md5' }))
                        }
                        catch (err) {
                            log.error(err);
                        }
                    }
                }
                var hash = hasha(addonFileHashes.join(''), { algorithm: 'md5' });
                resolve({ d, hash});
            })
            .catch(err => {
                reject(err);
            })
    })
}

function autoUpdateAddonProducer() {
    if (autoUpdateAddonsLeft.length > 0) {
        return autoUpdateAddon(autoUpdateAddonsLeft.pop())
    } else {
        return null
    }
}

function restorePromiseProducer() {
    if (cloudAddonsLeft > 0) {
        cloudAddonsLeft--;
        return restoreWoWAddonFile(cloudAddonsToRestore[cloudAddonsLeft])
    } else {
        return null
    }
}

function installAddonFromSyncProducer() {
    if (syncedAddonsToInstall.length > 0) {
        return installAddonFromSync(syncedAddonsToInstall.pop())
    } else {
        return null
    }
}

function unInstallAddonFromSyncProducer() {
    if (syncedAddonsToRemove.length > 0) {
        return uninstallAddonFromSync(syncedAddonsToRemove.pop())
    } else {
        return null
    }
}

module.exports = {
    syncFromProfile,
    setBrowserWindow,
    setAPIEndpoint,
    installAddon,
    updateAddon,
    uninstallAddon,
    createGranularBackupObj,
    restoreGranularBackup,
    backupAddonSettings,
    restoreAddonSettings,
    backupAddons,
    restoreAddons,
    findAddonDirectories,
    fingerprintAllAsync,
    identifyAddons,
    findInstalledWoWVersions,
    deleteLocalBackup,
    findAndUpdateAddons,
    setAddonUpdateInterval
  };