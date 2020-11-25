const electron = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const {app, ipcMain, BrowserWindow} = require('electron');
const axios = require('axios');
const PromisePool = require('es6-promise-pool');

const fileService = require('../services/file-service');
const storageService = require('../services/storage-service');
const authService = require('../services/auth-service');


const log = require('electron-log');

let browserWindowId = 1;

let syncing = false;
let error = null;

var snycProfilesToProcess=[];
var syncProfilesToCreate=[];


function setBrowserWindow(id) {
  browserWindowId = id;
}

let syncInterval = setInterval(() => {
  if (!syncing) {

    handleSync()
    .then(() => {
      log.info("Done with sync");
    })
    .catch(e => {
      log.error(e)
    })
  } else {
    log.info("Already searching for sync profile updates, skipping this run");
  }
},1000 * 60 * 5)

function handleSync() {
  return new Promise( (resolve, reject) => {
    log.info('Starting addon sync process');
    syncing = true;
    isSyncEnabled()
    .then((enabled)=>{
      return getSyncProfilesFromCloud(enabled)
    })
    .then((obj) => {
      if (obj.enabled) {
        obj.enabled.forEach(e => {
          let enabledProfile = obj.profiles.find(p => {
            return p.gameId === e.gameId && p.gameVersion === e.gameVersion
          })
          if (!enabledProfile) {
            syncProfilesToCreate.push({gameId: e.gameId, gameVersion: e.gameVersion})
          } else {
            snycProfilesToProcess.push(enabledProfile)
          }
        })
      }
      var pool = new PromisePool(handleSyncProfileProducer, 1)
      return pool.start()
    
    })
    .then(() => {
      var pool2 = new PromisePool(createSyncProfileProducer, 3)
      return pool2.start()
    })
    .then(() => {
      syncing = false;
      error = null;
      resolve()
    })
    .catch(err => {
      syncing = false;
      error = 'Error in automatic sync'
      reject(err);
    })
  })
}

function updateSyncProfiles(profiles) {
  return new Promise( (resolve, reject) => {
    log.info("Updating sync profiles");
    if (!syncing) {
      profiles.forEach(profile => {
        syncProfilesToCreate.push(profile)
      })
      let win = BrowserWindow.fromId(browserWindowId);
      var pool = new PromisePool(createSyncProfileProducer, 3)
      pool.start()
      .then(() => {
        syncing = false;
        
        if (win) {
          profiles.forEach(profile => {
            win.webContents.send('sync-status', profile.gameId, profile.gameVersion, 'sync-complete', null, null)  
          })
        }
        log.info('Finished updating sync profiles');
        return resolve();
      })
      .catch(err => {
        syncing = false;
        error = 'Error in automatic sync';
        if (win) {
          profiles.forEach(profile => {
            win.webContents.send('sync-status', profile.gameId, profile.gameVersion, 'error', null, 'Error in sync after auto-updating')  
          })
        }
        reject(err);
      })
    } else {
      return reject('Already syncing');
    }
  })
}

function isSyncEnabled() {
  return new Promise( (resolve, reject) => {
    let gameS = storageService.getGameSettings('1')
    let enabled = [];
    for (var gameVersion in gameS) {
      if (gameS[gameVersion].sync) {
        enabled.push({
          gameId: 1,
          gameVersion: gameVersion
        });
      }
    }
    if (enabled.length > 0) {
      return resolve(enabled);
    }
    return reject('Sync is not enabled on any games or game versions');
  })
}


function isSearchingForProfiles() {
  return syncing;
}

function getSyncError() {
  return error;
}

async function getLocalSyncProfile(gameId, gameVersion) {
  return storageService.getLocalAddonSyncProfile(gameId, gameVersion)
}

async function getSyncProfilesFromCloud(enabled=[]) {
    return new Promise( (resolve, reject) => {
        if (authService.isAuthenticated()) {
            log.info('Fetching cloud sync profiles'); 
            syncing = true;   
            error = null;
            let axiosConfig = {
                headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'User-Agent': 'Singularity-'+app.getVersion(),
                'x-auth': authService.getAccessToken()}
            };
            axios.get(`https://api.singularitymods.com/api/v1/user/sync/get?all=true`, axiosConfig)
            .then( res => {
              if (res.status === 200 && res.data.success) {
                  log.info('Addon sync profiles found');
                  syncing = false;
                  resolve({
                    enabled: enabled,
                    profiles: res.data.profiles
                  })
              } else {
                  log.info('No addon sync profiles found');
                  syncing = false;
                  reject('No addon sync profile found in the cloud')
              }
          })
          .catch((err) => {
              log.error('Error fetching addon sync profiles');
              log.error(err);
              syncing = false;
              error = 'Error fetching sync profile from cloud'
              reject('Error fetching addon sync profiles from the cloud')
          })
        } else {
          log.info('User is not authenticated, skipping addon sync profile search');
          syncing = false;
          error = "Not authenticated, can't retrieve profile"
          resolve('User is not authenticated, skipping addon sync profile search')
      }
    })
}

function createSyncProfileObj(gameId, gameVersion) {
  return new Promise( (resolve, reject) => {
      let gameS = storageService.getGameSettings(gameId.toString());
      let installedAddons = gameS[gameVersion].installedAddons;
      let addons = []
      installedAddons.forEach( addon => {
          addons.push(
              {
                  addonId: addon.addonId,
                  addonName: addon.addonName,
                  trackBranch: addon.trackBranch,
                  autoUpdate: addon.autoUpdate,
                  fileId: addon.installedFile.fileId,
                  fileName: addon.installedFile.fileName,
                  fileDate: addon.installedFile.fileDate,
                  downloadUrl: addon.installedFile.downloadUrl,
                  releaseType: addon.installedFile.releaseType,
                  gameVersion: addon.installedFile.gameVersion
              }
          )
      })
      resolve({
        gameId: gameId,
        uuid: storageService.getAppData('UUID'),
        gameVersion: gameVersion,
        addons: addons
      })
  })
}

function createAndSaveSyncProfile(obj) {
  return new Promise( (resolve, reject) => {
    log.info('Updating sync profile for '+obj.gameVersion)
    let win = BrowserWindow.fromId(browserWindowId);
    if (win) {
      win.webContents.send('sync-status', obj.gameId, obj.gameVersion, 'creating-profile', null, null)  
    }
    createSyncProfileObj(obj.gameId, obj.gameVersion)
    .then(result => {
      let axiosConfig = {
        headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Singularity-'+app.getVersion(),
        'x-auth': authService.getAccessToken()}
      };
      return axios.post(`https://api.singularitymods.com/api/v1/user/sync/set`,result, axiosConfig)
    })
    .then(res => {
      if (res && res.status === 200 && res.data.success) {
        //event.sender.send('sync-profile-submitted', true, gameId, gameVersion, null);
        resolve({})
      } else {
        log.error('Error pushing sync profile to the cloud');
        //event.sender.send('sync-profile-submitted', false, gameId, gameVersion, 'Error pushing sync profile to the cloud'); 
        reject('Error pushing sync profile to the cloud');
      }
    })
    .catch(err => {
      log.error('Error creating and saving sync profile');
      reject('Error creating and saving sync profile')
    })
  })
}

function createSyncProfileProducer() {
  if (syncProfilesToCreate.length > 0) {
      return createAndSaveSyncProfile(syncProfilesToCreate.pop())
  } else {
      return null
  }
}

function handleSyncProfileProducer() {
  if (snycProfilesToProcess.length > 0) {
      return fileService.syncFromProfile(snycProfilesToProcess.pop())
  } else {
      return null
  }
}

module.exports = {
  setBrowserWindow,
  updateSyncProfiles,
  handleSync,
  isSearchingForProfiles,
  getSyncError,
  getSyncProfilesFromCloud,
  getLocalSyncProfile,
  createSyncProfileObj,
  createAndSaveSyncProfile
}