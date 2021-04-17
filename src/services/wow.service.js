import path from 'path';
import { promises as fsPromises } from 'fs';

import {
  getInstallPath,
} from './storage.service';

function getWowAccounts(gameVersion) {
  return new Promise((resolve, reject) => {
    const installPath = getInstallPath(1, gameVersion);
    const accountPath = path.join(installPath, 'WTF/Account');
    fsPromises.access(accountPath)
      .then(() => fsPromises.readdir(accountPath, { withFileTypes: true }))
      .then((directories) => {
        if (directories.length > 0) {
          const filteredDirs = directories.filter((o) => o.isDirectory() && !o.name.startsWith('.'))
            .map((o) => o.name);
          if (filteredDirs.length > 0) {
            return resolve(filteredDirs);
          }
        }
        return reject(new Error('No accounts identified for game verison'));
      })
      .catch(() => reject(new Error('No accounts identified for game verison')));
  });
}

export default getWowAccounts;
