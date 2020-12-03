import { ipcMain, net, shell } from 'electron';
import log from 'electron-log';
import path from 'path';

import { getAccessToken, isAuthenticated } from '../../services/auth.service';
import {
  getAppData,
  getGameData,
  getGameSettings,
  setGameSettings
} from '../../services/storage.service';
import {
  createAndSaveSyncProfile,
  fingerprintAllAsync,
  identifyAddons,
  installAddon,
  syncFromProfile,
  uninstallAddon,
  updateAddon
} from '../../services/file.service';

ipcMain.on('addon-search', (event, gameId, gameVersion, searchFilter, categoryId, page, pageSize) => {
  let gameVersions = getGameData(gameId.toString()).gameVersions;
  let addonVersion = gameVersions[gameVersion].addonVersion;

  var index = page * pageSize;
  if (categoryId == null) {
      categoryId = 0;
  }
  const request = net.request(`https://api.singularitymods.com/api/v1/addons/search?gameId=${gameId}&gameVersionFlavor=${addonVersion}&filter=${searchFilter}&category=${categoryId}&index=${index}`);
  request.setHeader('x-app-uuid', getAppData('UUID'));
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

ipcMain.on('change-addon-auto-update', (event, gameId, gameVersion, addonId, toggle) => {
  log.info('Changing auto update settings for: '+addonId+' to: '+toggle);

  let gameS = getGameSettings(gameId.toString());
  let installedAddons = gameS[gameVersion].installedAddons;

  let addon = installedAddons.find( (a) => {
      return a.addonId == addonId;
  });
  addon.autoUpdate = toggle;

  installedAddons = installedAddons.map(a => 
      a.addonId === addonId
          ?   addon
          :   a
  );
  gameS[gameVersion].installedAddons = installedAddons;
  setGameSettings(gameId.toString(), gameS);
  event.sender.send('addon-settings-updated',addonId, addon);  
  if (gameS[gameVersion].sync && isAuthenticated()) {
      log.info('Game version is configured to sync, updating profile');
      createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
      .then(() => {
          log.info('Sync profile updated');
      })
      .catch(err => {
          log.error('Error saving sync profile');
          log.error(err);
      })
  } 
});

ipcMain.on('change-addon-branch', (event, gameId, gameVersion, addonId, branch) => {
  log.info('Changing release branch for: '+addonId+' to: '+branch);
  let gameVersions = getGameData(gameId.toString()).gameVersions;
  let gameS = getGameSettings(gameId.toString());
  let addonVersion = gameVersions[gameVersion].addonVersion;
  let installedAddons = gameS[gameVersion].installedAddons;
  let addon = installedAddons.find( (a) => {
      return a.addonId == addonId;
  });
  addon.trackBranch = branch;
  addon.updateAvailable = false;
  addon.updatefile = {};

  let possibleFiles = addon.latestFiles.filter((file) => {
      return (file.releaseType <= addon.trackBranch && file.gameVersionFlavor == addonVersion);
  });
  if (possibleFiles && possibleFiles.length > 0) {
      let latestFile = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
      if (addon.installedFile.fileDate < latestFile.fileDate) {
          addon.updateAvailable = true;
          addon.updatefile = latestFile;
      }
  }
  
  installedAddons = installedAddons.map(a => 
      a.addonId === addonId
          ?   addon
          :   a
  );
  gameS[gameVersion].installedAddons = installedAddons;
  setGameSettings(gameId.toString(), gameS);
  event.sender.send('addon-settings-updated',addonId, addon);
  if (gameS[gameVersion].sync && isAuthenticated()) {
      log.info('Game version is configured to sync, updating profile');
      createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
      .then(() => {
          log.info('Sync profile updated');
      })
      .catch(err => {
          log.error('Error saving sync profile');
          log.error(err);
      })
  }
});

ipcMain.on('change-addon-ignore-update', (event, gameId, gameVersion, addonId, toggle) => {
  log.info('Changing ignore update settings for: '+addonId+' to: '+toggle);

  let gameS = getGameSettings(gameId.toString());
  let installedAddons = gameS[gameVersion].installedAddons;

  let addon = installedAddons.find( (a) => {
      return a.addonId == addonId;
  });
  addon.ignoreUpdate = toggle;

  installedAddons = installedAddons.map(a => 
      a.addonId === addonId
          ?   addon
          :   a
  );
  gameS[gameVersion].installedAddons = installedAddons;
  setGameSettings(gameId.toString(), gameS);
  event.sender.send('addon-settings-updated',addonId, addon);   
});

ipcMain.on('find-addons-async', async (event, gameId, gameVersion) =>{
  log.info('Called: find-addons');
  let gameS = getGameSettings(gameId.toString());
  let gameVersions = getGameData(gameId.toString()).gameVersions;
  if (gameS[gameVersion].sync) {
      event.sender.send('sync-status', gameId, gameVersion, 'sync-started', null, null)   
  }

  if (process.platform === "win32") {
      var hashMap = await fingerprintAllAsync(gameId, gameS[gameVersion].installPath, gameVersions[gameVersion].addonDir);
  } else if (process.platform === "darwin") {
      var hashMap = await fingerprintAllAsync(gameId, gameS[gameVersion].installPath, gameVersions[gameVersion].macAddonDir);
  }
  log.info('Fingerprinted '+Object.keys(hashMap).length+ 'directories for '+gameVersion);
  identifyAddons(gameId.toString(), gameVersion, hashMap)
  .then(result => {
      if (gameS[gameVersion].sync) {
          log.info('Sync enabled for game version')
          if (isAuthenticated()) {
              log.info('Fetching addon sync profile');    
              let axiosConfig = {
                  headers: {
                  'Content-Type': 'application/json;charset=UTF-8',
                  'User-Agent': 'Singularity-'+app.getVersion(),
                  'x-auth': getAccessToken()}
              };
              event.sender.send('sync-status', gameId, gameVersion, 'checking-cloud', null, null)   
              axios.get(`https://api.singularitymods.com/api/v1/user/sync/get?gameId=${gameId}&gameVersion=${gameVersion}`, axiosConfig)
              .then( res => {
                  if (res.status === 200 && res.data.success) {
                      log.info('Addon sync profile found');
                      syncFromProfile(res.data.profile)      
                  } else if (res.status === 200 ){
                      log.info('No addon sync profile found');
                      createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
                  } else {
                      return Promise.reject('Error searching for sync profile');
                  }
              })
              .then(() => {
                  log.info('Sync process complete');
                  event.sender.send('sync-status', gameId, gameVersion, 'sync-complete', new Date(), null)   
              })
              .catch((err) => {
                  log.error('Error handling addon sync');
                  log.error(err);
                  if (err instanceof String) {
                      event.sender.send('sync-status', gameId, gameVersion, 'error', null, err)  
                  } else {
                      event.sender.send('sync-status', gameId, gameVersion, 'error', null, 'Error handling addon sync')  
                  }
              })
          } else {
              log.info('User is not authenticated, nothing to sync');
              event.sender.send('sync-status', gameId, gameVersion, 'error', null, 'User not authenticated')
          }
      }
  })
  .catch(err => {
      console.log(err);
      log.error('Error attempting to identify addons for '+gameVersion +' in find-addons');
  })     
})

ipcMain.on('get-addon-info', (event, addonId) => {
    const request = net.request(`https://api.singularitymods.com/api/v1/addon/${addonId}`);
    request.setHeader('x-app-uuid', getAppData('UUID'));
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

ipcMain.on('install-addon', async (event, gameId, gameVersionFlavor, addon, branch) => {
  let gameS = getGameSettings(gameId.toString());
  let gameVersions = getGameData(gameId.toString()).gameVersions;
  let addonVersionFlavor = gameVersions[gameVersionFlavor].addonVersion;
  if (process.platform === "win32") {
      var addonDir = path.join(gameS[gameVersionFlavor].installPath, gameVersions[gameVersionFlavor].addonDir);
  } else if (process.platform === "darwin") {
      var addonDir = path.join(gameS[gameVersionFlavor].installPath, gameVersions[gameVersionFlavor].macAddonDir);
  }
  
  let installedFile = {}
  for (var i in addon.latestFiles) {
      if (addon.latestFiles[i].gameVersionFlavor == addonVersionFlavor && addon.latestFiles[i].releaseType == branch) {
          installedFile = addon.latestFiles[i]
      }
  }
  installAddon(gameId, addonDir, installedFile)
      .then(msg => {
          

          var trackBranch = addon.trackBranch || 1;
          var autoUpdate = addon.autoUpdate || false;
          var ignoreUpdate = addon.ignoreUpdate || false;

          var updateAvailable = false;
          var updateFile = addon.latestFiles.find( (f) => {
              return (f.gameVersion == addonVersionFlavor && f.releaseType <= trackBranch && f.fileDate > installedFile.fileDate)
          })
          if (updateFile) {
              updateAvailable = true;
          } else {
              updateFile = {}
          }
          let installedAddon = {
              "addonName": addon.addonName,
              "addonId": addon.addonId,
              "primaryCategory": addon.primaryCategory,
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
          setGameSettings(gameId.toString(), gameS);
          event.sender.send('addon-installed', installedAddon);
          if (gameS[gameVersionFlavor].sync && isAuthenticated()) {
              log.info('Game version is configured to sync, updating profile');
              createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersionFlavor})
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
})

ipcMain.on('install-addon-file', async (event, gameId, gameVersionFlavor, addon, fileId) => {
  const request = net.request(`https://api.singularitymods.com/api/v1/file/${fileId}`);
  request.setHeader('x-app-uuid', getAppData('UUID'));
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
              let gameS = getGameSettings(gameId.toString());
              let gameVersions = getGameData(gameId.toString()).gameVersions;
              let addonVersion = gameVersions[gameVersionFlavor].addonVersion;
              if (process.platform === "win32") {
                  var addonDir = path.join(gameS[gameVersionFlavor].installPath, gameVersions[gameVersionFlavor].addonDir);
              } else if (process.platform === "darwin") {
                  var addonDir = path.join(gameS[gameVersionFlavor].installPath, gameVersions[gameVersionFlavor].macAddonDir);
              }

              let installedFile = f;
              installAddon(gameId, addonDir, installedFile)
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
                      setGameSettings(gameId.toString(), gameS);
                      event.sender.send('addon-installed', installedAddon);
                      if (gameS[gameVersionFlavor].sync && isAuthenticated()) {
                          log.info('Game version is configured to sync, updating profile');
                          createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersionFlavor})
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

ipcMain.on('open-addon-directory', (event, gameId, gameVersion, directory) => {
  let gameVersions = getGameData(gameId.toString()).gameVersions;
  let gameS = getGameSettings(gameId.toString());
  if (process.platform === "win32") {
      var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].addonDir, directory);
  } else if (process.platform === "darwin") {
      var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].macAddonDir, directory);
  }
  shell.openPath(addonDir);
});

ipcMain.on('uninstall-addon', async (event, gameId, gameVersion, addonId) => {
  let gameS = getGameSettings(gameId.toString());
  let gameVersions = getGameData(gameId.toString()).gameVersions;
  if (process.platform === "win32") {
      var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].addonDir);
  } else if (process.platform === "darwin") {
      var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].macAddonDir);
  }
  let installedAddons = gameS[gameVersion].installedAddons;
  var addon = installedAddons.find((a) => {
      return a.addonId === addonId;
  })
  if (addon) {

      uninstallAddon(gameId, addonDir, addon)
          .then(msg => {
              let installedAddons = gameS[gameVersion].installedAddons;
              installedAddons = installedAddons.filter(obj => {
                  return obj.addonId !== addonId;
              })
              gameS[gameVersion].installedAddons = installedAddons;
              setGameSettings(gameId.toString(), gameS);
              event.sender.send('addon-uninstalled', addonId);
              if (gameS[gameVersion].sync && isAuthenticated()) {
                  log.info('Game version is configured to sync, updating profile');
                  createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
                  .then(() => {
                      log.info('Sync profile updated');
                  })
                  .catch(err => {
                      log.error('Error saving sync profile');
                      log.error(err);
                  })
              }
          }).catch(err => {
              event.sender.send('addon-uninstall-failed', addonId);
              log.error(err);
          })
  } else {
      event.sender.send('addon-uninstall-failed', addonId);
  }
})

ipcMain.on('update-addon', async (event, gameId, gameVersion, addon) => {
  log.info("Updating addon: " + addon.addonName);
  let gameS = getGameSettings(gameId.toString());
  let gameVersions = getGameData(gameId.toString()).gameVersions;
  let addonVersion = gameVersions[gameVersion].addonVersion;
  if (process.platform === "win32") {
      var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].addonDir);
  } else if (process.platform === "darwin") {
      var addonDir = path.join(gameS[gameVersion].installPath, gameVersions[gameVersion].macAddonDir);
  }
  let possibleFiles = addon.latestFiles.filter((file) => {
      return (file.releaseType <= addon.trackBranch && file.gameVersionFlavor == addonVersion);
  });
  if (possibleFiles && possibleFiles.length > 0) {
      let latestFile = possibleFiles.reduce((a, b) => (a.fileDate > b.fileDate ? a : b));
      updateAddon(gameId, addonDir, addon, latestFile)
          .then(msg => {
              addon.updateAvailable = false;
              addon.updateFile = {};
              addon.fileName = latestFile.fileName;
              addon.fileDate = latestFile.fileDate;
              addon.releaseType = latestFile.releaseType;
              addon.gameVersion = latestFile.gameVersion[0];
              addon.installedFile = latestFile;
              addon.modules = latestFile.modules;
              for (var a in gameS[gameVersion].installedAddons) {
                  if (gameS[gameVersion].installedAddons[a].addonId == addon.addonId) {
                      gameS[gameVersion].installedAddons[a] = addon;
                      break;
                  }
              }
              setGameSettings(gameId.toString(), gameS);
              event.sender.send('addon-installed', addon);
              if (gameS[gameVersion].sync && isAuthenticated()) {
                  log.info('Game version is configured to sync, updating profile');
                  createAndSaveSyncProfile({gameId: gameId, gameVersion: gameVersion})
                  .then(() => {
                      log.info('Sync profile updated');
                  })
                  .catch(err => {
                      log.error('Error saving sync profile');
                      log.error(err);
                  })
              }
          })
  } else {
      log.info("No updates found");
  }
})