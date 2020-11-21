const electron = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const {app, ipcMain, BrowserWindow} = require('electron');
const axios = require('axios');

const storageService = require('../services/storage-service');
const authService = require('../services/auth-service');

const log = require('electron-log');


let searching = false;

function isSearchingForProfiles() {
  return searching;
}

async function getLocalSyncProfile(gameId, gameVersion) {
  return storageService.getLocalAddonSyncProfile(gameId, gameVersion)
}

async function saveSyncProfileLocally(profile) {
  return storageService.setLocalAddonSyncProfile(profile)
}

async function getSyncProfilesFromCloud() {
    return new Promise( (resolve, reject) => {
        if (authService.isAuthenticated()) {
            log.info('Fetching cloud backups'); 
            searching = true;   
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
                  var promises = [];
                  for (var p in res.data.profiles) {
                    promises.push(saveSyncProfileLocally(res.data.profiles[p]))
                  }
                  Promise.allSettled(promises)
                  .then( () => {
                    searching = false;
                    resolve({});
                  })
                  .catch((e) => {
                    log.error(e);
                    searching = false;
                    reject('Error saving addon sync profiles')
                  })
              } else {
                  log.info('No addon sync profiles found');
                  searching = false;
                  resolve({})
              }
          })
          .catch((err) => {
              log.error('Error fetching addon sync profiles');
              log.error(err);
              searching = false;
              reject({})
          })
        } else {
          log.info('User is not authenticated, skipping addon sync profile search');
          searching = false;
          resolve({})
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
        gameVersion: gameVersion,
        addons: addons
      })
  })
}

module.exports = {
  isSearchingForProfiles,
  getSyncProfilesFromCloud,
  getLocalSyncProfile,
  createSyncProfileObj
}