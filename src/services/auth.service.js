import { getMainBrowserWindow } from './electron.service';

const axios = require('axios');
const keytar = require('keytar');
const os = require('os');
const jwt = require('jsonwebtoken');

const keytarService = 'Singularity';
const keytarAccount = os.userInfo().username;

const { app } = require('electron');

const log = require('electron-log');
const storageService = require('./storage.service');

let accessToken = null;
let profile = null;
let refreshToken = null;

function getAccessToken() {
  return accessToken;
}

function getProfile() {
  return profile;
}

function isAuthenticated() {
  if (accessToken) {
    return true;
  }
  return false;
}

function logout() {
  return new Promise((resolve, reject) => {
    keytar.deletePassword(keytarService, keytarAccount)
      .then(() => {
        accessToken = null;
        profile = null;
        refreshToken = null;
        resolve();
      })
      .catch((err) => {
        log.error(err);
        reject();
      });
  });
}

async function refreshTokens() {
  return new Promise((resolve, reject) => {
    keytar.getPassword(keytarService, keytarAccount)
      .then((token) => {
        if (!token) {
          return Promise.reject(new Error('No Token'));
        }
        return token;
      })
      .then((token) => {
        refreshToken = token;
        const refreshOptions = {
          method: 'POST',
          url: 'https://id.singularitymods.com/refresh',
          headers: {
            'content-type': 'application/json',
            'User-Agent': `Singularity-${app.getVersion()}`,
          },
          data: {
            refresh_token: token,
            uuid: storageService.getAppData('UUID'),
          },
        };
        return axios(refreshOptions);
      })
      .then((response) => {
        if (response.status === 200) {
          accessToken = response.data.access_token;
          profile = jwt.decode(response.data.id_token);
          refreshToken = response.data.refresh_token;
          return keytar.setPassword(keytarService, keytarAccount, refreshToken);
        }

        return reject(response.data.message);
      })
      .then(() => {
        log.info('User auth token refreshed');
        const win = getMainBrowserWindow();
        if (win) {
          win.webContents.send('auth-event', 'refresh', true, null);
        }
        return resolve();
      })
      .catch((err) => {
        if (err === 'No Token') {
          return reject(err);
        } if (err.code && err.code === 'ENOTFOUND') {
          log.error('Lost network connection, leave user session');
          return reject(err);
        }
        return logout()
          .then(() => {
            log.info('User deauthenticated');
            const win = getMainBrowserWindow();
            if (win) {
              win.webContents.send('auth-event', 'logout', true, null);
            }
            return reject(err);
          })
          .catch((logoutErr) => {
            log.error('Error deauthenticating user');
            log.error(logoutErr);
            return reject(logoutErr);
          });
      });
  });
}

function setTokens(data) {
  return new Promise((resolve, reject) => {
    log.info('Saving authentication material');
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    profile = jwt.decode(data.id_token);
    log.info('Saving refresh token');
    keytar.setPassword(keytarService, keytarAccount, refreshToken)
      .then(() => {
        log.info('Refresh token saved');
        resolve();
      })
      .catch((err) => {
        log.error(err);
        reject();
      });
  });
}

setInterval(() => {
  if (refreshToken) {
    log.info('Refreshing authentication tokens');
    refreshTokens()
      .then(() => {
        log.info('Authentication token refresh succesful');
      })
      .catch(() => {
        log.info('Authentication token refresh failed');
      });
  }
}, 600000);

export {
  isAuthenticated,
  getAccessToken,
  getProfile,
  logout,
  refreshTokens,
  setTokens,
};
