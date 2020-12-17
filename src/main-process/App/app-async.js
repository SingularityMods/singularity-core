import { app, ipcMain, shell } from 'electron';
import os from 'os';
import path from 'path';
import log from 'electron-log';

import { getAppData, setAppData } from '../../services/storage.service';
import {
  enableSentry,
  disableSentry,
} from '../../services/sentry.service';
import { getMainBrowserWindow } from '../../services/electron.service';

ipcMain.on('accept-terms', (_event, termType) => {
  log.info(`Accepted ${termType}`);
  const terms = getAppData(termType);
  terms.accepted = true;
  terms.acceptedOn = new Date();
  setAppData(termType, terms);
});

ipcMain.on('telemetry-response', (event, accepted) => {
  const userConf = getAppData('userConfigurable');
  if (accepted) {
    log.info('Telemetry Enabled');
    enableSentry();
    const win = getMainBrowserWindow();
    if (win) {
      win.webContents.send('telemetry-toggle', accepted);
    }
  } else {
    log.info('Telemetry Disabled');
    if (!userConf.beta) {
      disableSentry();
    }
    const win = getMainBrowserWindow();
    if (win) {
      win.webContents.send('telemetry-toggle', accepted);
    }
  }
  setAppData('telemetry-prompted', true);
  userConf.telemetry = accepted;
  setAppData('userConfigurable', userConf);
});

ipcMain.handle('get-terms', async () => getAppData('terms'));

ipcMain.handle('get-telemetry-status', async () => {
  const {
    telemetry,
    beta,
  } = getAppData('userConfigurable');
  return {
    prompted: getAppData('telemetry-prompted'),
    enabled: telemetry || beta,
  };
});

ipcMain.on('open-log-directory', () => {
  log.info('Opening log directory');
  let logDir;

  if (process.platform === 'darwin') {
    logDir = path.join(os.homedir ? os.homedir() : process.env.HOME, 'Library/Logs', app.getName());
  } else {
    logDir = path.join(app.getPath('appData'), app.getName(), 'logs');
  }

  shell.openPath(logDir);
});
