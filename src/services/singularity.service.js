import { app } from 'electron';
import axios from 'axios';
import queryString from 'query-string';

// import { getAccessToken, isAuthenticated } from '../../services/auth.service';
import AppConfig from '../config/app.config';
import { 
  getAddonDir,
  getAppData,
  getAddonVersion,
  updateInstalledAddonInfo
} from './storage.service';
import {
  installAddon,
  handleInstallDependencies,
} from './file.service';
import { getMainBrowserWindow } from './electron.service';

function getAddonsFromFingerprints(directories) {
  return new Promise((resolve, reject) => {
    if (directories.length === 0) {
      return resolve([]);
    }
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-app-uuid': getAppData('UUID'),
        'x-app-platform': process.platform,
      },
    };
    const postData = { directories };
    return axios.post(`${AppConfig.API_URL}/addons/identify`, postData, axiosConfig)
      .then((res) => {
        if (res.status !== 200) {
          return reject(new Error('Unable to fingerprint addons'));
        }
        return resolve(res.data);
      })
      .catch((error) => reject(error));
  });
}

function getAddonDownloadUrl(addonId, fileId) {
  return new Promise((resolve, reject) => {
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-app-uuid': getAppData('UUID'),
      },
    };
    let requestUrl = `${AppConfig.API_URL}/addon/download/${addonId}`;
    if (fileId) {
      requestUrl = `${AppConfig.API_URL}/addon/download/${addonId}/${fileId}`;
    }
    return axios.get(requestUrl, axiosConfig)
      .then((res) => {
        if (res.status !== 200) {
          return reject(new Error('No download info recieved'));
        }
        return resolve(res.data);
      })
      .catch((error) => reject(error));
  });
}

function getAddonInfo(addonId) {
  return new Promise((resolve, reject) => {
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-app-uuid': getAppData('UUID'),
      },
    };
    const requestUrl = `${AppConfig.API_URL}/addon/${addonId}`;
    return axios.get(requestUrl, axiosConfig)
      .then((res) => {
        if (res.status !== 200) {
          return reject(new Error('No addon info recieved'));
        }
        return resolve(res.data);
      })
      .catch((error) => reject(error));
  });
}

function searchForAddons(
  gameId, gameVersion, searchFilter, categoryId, page, pageSize, sort, sortOrder,
) {
  return new Promise((resolve, reject) => {
    const addonVersion = getAddonVersion(gameId, gameVersion);
    const index = page * pageSize;
    const catId = categoryId || 0;
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-app-uuid': getAppData('UUID'),
      },
    };
    const requestUrl = `${AppConfig.API_URL}/addons/search?gameId=${gameId}&gameVersionFlavor=${addonVersion}&filter=${searchFilter}&category=${catId}&index=${index}&sort=${sort}&sortOrder=${sortOrder}`;
    return axios.get(requestUrl, axiosConfig)
      .then((res) => {
        if (res.status !== 200) {
          return reject(new Error('No addon info recieved'));
        }
        return resolve(res.data);
      })
      .catch((error) => reject(error));
  });
}

function installAddonFromProtocolUrl(addon, fileId) {
  return new Promise((resolve, reject) => {
    getAddonDownloadUrl(addon.addonId, fileId)
      .then((fileInfo) => {
        let gameId = 1;
        let gameVersion = fileInfo.fileDetails.gameVersionFlavor;
        if (gameVersion === 'wow_retail'
          || gameVersion === 'wow_classic') {
            gameId = 1;
          } else if (gameVersion === 'eso') {
            gameId = 2;
          }
        const addonDir = getAddonDir(gameId, gameVersion);
        installAddon(addonDir, fileInfo.downloadUrl)
        .then(() => {
          updateInstalledAddonInfo(gameId, gameVersion, addon, fileInfo.fileDetails)
        })
        .then((installedAddon) => handleInstallDependencies(gameId, gameVersion, installedAddon))
        .then((installedAddon) => {
          const gameS = getGameSettings(gameId.toString());
          if (gameS[gameVersion].sync && isAuthenticated()) {
            log.info('Game version is configured to sync, updating profile');
            return createAndSaveSyncProfile({ gameId, gameVersion })
              .then(() => {
                log.info('Sync profile updated');
                return resolve(installedAddon);
              })
              .catch((err) => {
                log.error('Error saving sync profile');
                log.error(err);
                return resolve(installedAddon);
              });
          }
          log.info(`Succesfully installed ${installedAddon.addonName}`);
          return resolve(installedAddon);
        })
      })
      .catch((error) => {
        log.error(error.message);
        return reject(error);
      });
  })
}

function handleProtocolUrl(url) {
  return new Promise((resolve, reject) => {
    console.log(url);
    const urlParts = url.split('?');
    if (!urlParts || urlParts.length < 2) {
      return reject(new Error('Invalid download URL'));
    }
    const win = getMainBrowserWindow();
    const query = queryString.parse(urlParts[1]);
    let addonId;
    let fileId;
    let clusterId;
    if ('addonId' in query) {
      addonId = query.addonId;
    }
    if ('fileId' in query) {
      fileId = query.fileId;
    }
    if ('clusterId' in query) {
      clusterId = query.clusterId;
    }
    if (!addonId && !clusterId) {
      return reject( new Error('Missing addonId'));
    }
    getAddonInfo(addonId)
      .then((addon) => {
        installAddonFromProtocolUrl(addon,fileId)
    })
    /*
    const win = getMainBrowserWindow();
    if (!win) {
      return reject( new Error('Singularity app window is closed, cannot install addon from link'));
    }
    if (addonId) {
      return getAddonDownloadUrl(addonId, fileId)
      return win.webContents.send('install-addon-from-protocol', addonId, fileId);
    }
    return win.webContents.send('install-cluster-from-protocol', clusterId);
    */
  })

}

export {
  getAddonInfo,
  getAddonDownloadUrl,
  getAddonsFromFingerprints,
  handleProtocolUrl,
  searchForAddons,
};
