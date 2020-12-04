import { app, ipcMain, shell } from 'electron';
import os from 'os';
import path from 'path';
import log from 'electron-log';

import { getAppData, setAppData } from '../../services/storage.service';

ipcMain.on('accept-terms', (_event, termType) => {
  log.info(`Accepted ${termType}`);
  const terms = getAppData(termType);
  terms.accepted = true;
  terms.acceptedOn = new Date();
  setAppData(termType, terms);
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
