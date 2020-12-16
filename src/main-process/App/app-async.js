import { app, ipcMain, shell } from 'electron';
import os from 'os';
import path from 'path';
import log from 'electron-log';
import * as Sentry from '@sentry/electron';

import { getAppData, setAppData } from '../../services/storage.service';

ipcMain.on('accept-terms', (_event, termType) => {
  log.info(`Accepted ${termType}`);
  const terms = getAppData(termType);
  terms.accepted = true;
  terms.acceptedOn = new Date();
  setAppData(termType, terms);
});

ipcMain.on('telemetry-response', (event, accepted) => {
  if (accepted) {
    Sentry.getCurrentHub().getClient().getOptions().enabled = true;
    log.info('Telemetry Enabled');
  } else {
    Sentry.getCurrentHub().getClient().getOptions().enabled = false;
    log.info('Telemetry Disabled');
  }
  setAppData('telemetry-prompted', true);
  const userConf = getAppData('userConfigurable');
  userConf.telemetry = accepted;
  setAppData('userConfigurable', userConf);
});

ipcMain.handle('get-terms', async () => getAppData('terms'));

ipcMain.handle('get-telemetry-status', async() => {
  return {
    prompted: getAppData('telemetry-prompted'),
    enabled: getAppData('userConfigurable').telemetry
  }
})

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
