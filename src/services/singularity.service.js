import { app } from 'electron';
import axios from 'axios';

import AppConfig from '../config/app.config';
import {
  getAppData,
  getAddonVersion,
} from './storage.service';

function getAddonsFromFingerprints(directories, addonVersion) {
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
    return axios.post(`${AppConfig.API_URL}/addon/identify/${addonVersion}`, postData, axiosConfig)
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

    let requestUrl = `${AppConfig.API_URL}/addon/${addonId}/download`;
    if (fileId) {
      requestUrl = `${AppConfig.API_URL}/addon/${addonId}/download/${fileId}`;
    }
    return axios.get(requestUrl, axiosConfig)
      .then((res) => {
        if (res.status !== 200) {
          return reject(new Error('No download info received'));
        }
        return resolve(res.data);
      })
      .catch((error) => reject(error));
  });
}

function getWagoDownloadUrl(gameVersionFlavor) {
  return new Promise((resolve, reject) => {
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-app-uuid': getAppData('UUID'),
      },
    };

    const requestUrl = `${AppConfig.API_URL}/wago/${gameVersionFlavor}`;
    return axios.get(requestUrl, axiosConfig)
      .then((res) => {
        if (res.status !== 200) {
          return reject(new Error('No download info received'));
        }
        return resolve(res.data);
      })
      .catch((error) => reject(error));
  });
}

function getClusterDownloadInfo(clusterId) {
  return new Promise((resolve, reject) => {
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-app-uuid': getAppData('UUID'),
      },
    };
    const requestUrl = `${AppConfig.API_URL}/cluster/${clusterId}/download`;
    return axios.get(requestUrl, axiosConfig)
      .then((res) => {
        if (res.status !== 200) {
          return reject(new Error('No download info received'));
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
          return reject(new Error('No addon info received'));
        }
        return resolve(res.data);
      })
      .catch((error) => reject(error));
  });
}

function getCluster(clusterId) {
  return new Promise((resolve, reject) => {
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-app-uuid': getAppData('UUID'),
      },
    };
    const requestUrl = `${AppConfig.API_URL}/cluster/${clusterId}`;
    return axios.get(requestUrl, axiosConfig)
      .then((res) => {
        if (res.status !== 200) {
          return reject(new Error('No addon cluster received'));
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
    const requestUrl = `${AppConfig.API_URL}/addon/search?gameId=${gameId}&gameVersionFlavor=${addonVersion}&filter=${searchFilter}&category=${catId}&index=${index}&sort=${sort}&sortOrder=${sortOrder}`;
    return axios.get(requestUrl, axiosConfig)
      .then((res) => {
        if (res.status !== 200) {
          return reject(new Error('No addon info received'));
        }
        return resolve(res.data);
      })
      .catch((error) => reject(error));
  });
}

export {
  getAddonInfo,
  getAddonDownloadUrl,
  getAddonsFromFingerprints,
  getCluster,
  getClusterDownloadInfo,
  searchForAddons,
  getWagoDownloadUrl,
};
