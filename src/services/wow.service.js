

import path from 'path';
import { promises as fsPromises } from 'fs';

import {
  getInstallPath,
} from './storage.service';

function get_wow_accounts(gameVersion) {
  return new Promise((resolve, reject) => {
    const installPath = getInstallPath(1,gameVersion);
    const accountPath = path.join(installPath,'WTF/Account')
    fsPromises.access(accountPath)
      .then(() => {
        return fsPromises.readdir(accountPath)
      })
      .then((directories) => {
        if (directories.length > 0) {
          return resolve(directories);
        }
        return reject(new Error('No accounts identified for game verison'));
      })
      .catch(() => {
        return reject(new Error('No accounts identified for game verison'));
      })
  })

}

export {
  get_wow_accounts
}