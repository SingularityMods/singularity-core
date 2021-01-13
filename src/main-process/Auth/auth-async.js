import { app, ipcMain } from 'electron';
import axios from 'axios';
import os from 'os';
import log from 'electron-log';

import AppConfig from '../../config/app.config';

import { getAppData } from '../../services/storage.service';
import { getAccessToken, logout, setTokens } from '../../services/auth.service';

ipcMain.on('check-username', async (event, username) => {
  const postData = {
    username,
  };
  const axiosConfig = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'User-Agent': `Singularity-${app.getVersion()}`,
    },
  };
  axios.post(`${AppConfig.AUTH_API_URL}/checkusername`, postData, axiosConfig)
    .then((res) => {
      if (res.status === 200) {
        if (res.data.available) {
          event.sender.send('username-check', username, true);
        } else {
          event.sender.send('username-check', username, false);
        }
      } else {
        event.sender.send('username-check', username, false);
      }
    })
    .catch(() => {
      event.sender.send('username-check', username, false);
    });
});

ipcMain.on('login-auth', async (event, email, password) => {
  const postData = {
    email,
    password,
    uuid: getAppData('UUID'),
    platform: process.platform,
    hostname: os.hostname(),
  };
  const axiosConfig = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'User-Agent': `Singularity-${app.getVersion()}`,
    },
  };
  axios.post(`${AppConfig.AUTH_API_URL}/login`, postData, axiosConfig)
    .then((res) => {
      if (res.status === 200) {
        if (res.data.auth) {
          log.info('Received succesful auth response');
          setTokens(res.data)
            .then(() => {
              log.info('User authenticated');
              event.sender.send('auth-event', 'login', true, null);
            })
            .catch(() => {
              event.sender.send('auth-event', 'login', false, 'Site error, contact support!');
            });
        } else {
          event.sender.send('auth-event', 'login', false, res.data.message);
        }
      } else {
        event.sender.send('auth-event', 'login', false, 'Site error, contact support!');
      }
    })
    .catch(() => {
      event.sender.send('auth-event', 'login', false, 'Site error, contact support!');
    });
});

ipcMain.on('logout-auth', async (event) => {
  logout()
    .then(() => {
      log.info('User logged out');
      event.sender.send('auth-event', 'logout', true, null);
    })
    .catch(() => {
      event.sender.send('auth-event', 'logout', false, 'Error logging out user');
    });
});

ipcMain.on('resend-email-auth', async (event) => {
  const postData = {};
  const axiosConfig = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'User-Agent': `Singularity-${app.getVersion()}`,
      'x-auth': getAccessToken(),
    },
  };
  axios.post(`${AppConfig.AUTH_API_URL}/resendemail`, postData, axiosConfig)
    .then((res) => {
      if (res.status === 200) {
        event.sender.send('email-resent', true);
      } else {
        event.sender.send('email-resent', false);
      }
    })
    .catch(() => {
      event.sender.send('email-resent', false);
    });
});

ipcMain.on('signup-auth', async (event, username, email, password) => {
  const postData = {
    username,
    email,
    password,
    uuid: getAppData('UUID'),
    platform: process.platform,
  };
  const axiosConfig = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'User-Agent': `Singularity-${app.getVersion()}`,
    },
  };
  axios.post(`${AppConfig.AUTH_API_URL}/register`, postData, axiosConfig)
    .then((res) => {
      if (res.status === 200) {
        if (res.data.auth) {
          setTokens(res.data)
            .then(() => {
              log.info('User authenticated');
              event.sender.send('auth-event', 'signup', true, null);
            })
            .catch(() => {
              event.sender.send('auth-event', 'signup', false, 'Site error, contact support!');
            });
        } else {
          event.sender.send('auth-event', 'signup', false, res.data.message);
        }
      } else {
        event.sender.send('auth-event', 'signup', false, 'Site error, contact support!');
      }
    })
    .catch(() => {
      event.sender.send('auth-event', 'signup', false, 'Site error, contact support!');
    });
});
