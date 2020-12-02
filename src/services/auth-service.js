const axios = require("axios");
const url = require("url");
const keytar = require("keytar");
const os = require("os");
var jwt = require( 'jsonwebtoken' );

const keytarService = "Singularity";
const keytarAccount = os.userInfo().username;

const storageService = require('../services/storage-service');
const {app, ipcMain, BrowserWindow} = require('electron');

const log = require('electron-log');

let accessToken = null;
let profile = null;
let refreshToken = null;
let browserWindowId = 1;

let refreshInterval = setInterval(() => {
  if (refreshToken) {
    log.info('Refreshing authentication tokens');
    refreshTokens()
    .then(() => {
      log.info('Authentication token refresh succesful');
    })
    .catch(err => {
      log.info('Authentication token refresh failed');  
    })
  }
},600000)

function setBrowserWindow(id) {
  browserWindowId = id;
}

function getAccessToken() {
  return accessToken;
}

function getProfile() {
  return profile;
}

function isAuthenticated() {
  if(accessToken) {
    return true;
  }
  return false;
}

async function refreshTokens() {
  return new Promise( (resolve, reject) => {
    keytar.getPassword(keytarService, keytarAccount)
    .then( token => {
      if (!token) {
        return Promise.reject('No Token')
      } else {
        return token;
      }  
    })
    .then (token => {
      refreshToken = token;
      const refreshOptions = {
        method: "POST",
        url: `https://id.singularitymods.com/refresh`,
        headers: { 
          "content-type": "application/json",
          'User-Agent': 'Singularity-'+app.getVersion()
        },
        data: {
          refresh_token: token,
          uuid: storageService.getAppData('UUID')
        },
      };
      return axios(refreshOptions);
    })
    .then(response => {
      if (response.status === 200) {
        accessToken = response.data.access_token;
        profile = jwt.decode(response.data.id_token);
        refreshToken = response.data.refresh_token;
        return keytar.setPassword(keytarService, keytarAccount, refreshToken)
      }
      else {
        return reject(data.message);
      }
    })
    .then (res => {
      log.info('User auth token refreshed');
      let win = BrowserWindow.fromId(browserWindowId);
      if (win) {
        win.webContents.send('auth-event', 'refresh', true, null);
      }
      resolve();
    })
    .catch(err => {
      if (err == 'No Token') {
        return reject(err);
      }
      log.error('Error refreshing tokens');
      if (err.code && err.code == 'ENOTFOUND') {
        log.error('Lost network connection, leave user session');
        return reject(err);
      } else {
        logout()
        .then (() => {
          log.info('User deauthenticated');
          let win = BrowserWindow.fromId(browserWindowId);
          if (win) {
            win.webContents.send('auth-event', 'logout', true, null);
          }
          reject(err);
        })
        .catch (err => {
          log.error('Error deauthenticating user');
          log.error(err);
          reject(err);
        }) 
      } 
    })
  })
}

function setTokens(data) {
  return new Promise( (resolve,reject) => {
    log.info('Saving authentication material');
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    profile = jwt.decode(data.id_token);
    log.info('Saving refresh token')
    keytar.setPassword(keytarService, keytarAccount, refreshToken)
    .then( result => {
      log.info('Refresh token saved');
      resolve();
    })
    .catch( err => {
      log.error(err);
      reject();
    })
  })
}

function logout() {
  return new Promise( (resolve, reject) => {
    keytar.deletePassword(keytarService, keytarAccount)
    .then( result => {
      accessToken = null;
      profile = null;
      refreshToken = null;
      resolve();
    })
    .catch (err => {
      log.error(err);
      reject();
    })
  })
}

module.exports = {
  setBrowserWindow,
  isAuthenticated,
  getAccessToken,
  getProfile,
  logout,
  refreshTokens,
  setTokens
};