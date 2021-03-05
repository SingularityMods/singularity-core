import { app, ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import os from 'os';
import log from 'electron-log';

import AppConfig from '../../config/app.config';

import { getAccessToken, isAuthenticated } from '../../services/auth.service';
import {
  createGranularBackupObj,
  deleteLocalBackup,
  restoreGranularBackup,
} from '../../services/file.service';
import {
  getAppData,
  getBackupDataAsync,
  getLocalBackupDetails,
  saveBackupInfo,
} from '../../services/storage.service';

ipcMain.on('create-granular-backup', async (event, gameId, gameVersion, cloud) => {
  log.info('Creating granular backup');
  event.sender.send('backup-status', 'Initializing Backup');
  event.sender.send('app-status-message', 'Initializing backup', 'status');
  createGranularBackupObj(gameId, gameVersion)
    .then((backupObj) => {
      const fileData = {
        version: 2,
        file: backupObj.encodedFile,
        time: new Date(),
        backupUUID: uuidv4(),
        gameId,
        gameVersion,
        addons: backupObj.addons,
        uuid: getAppData('UUID'),
        hostname: os.hostname(),
      };
      const size = Buffer.byteLength(JSON.stringify(fileData));
      fileData.size = size;
      event.sender.send('backup-status', 'Saving Backup Locally');
      event.sender.send('app-status-message', 'Saving backup locally', 'status');
      return saveBackupInfo(gameId.toString(), gameVersion, fileData)
        .then(() => fileData);
    })
    .then((fileData) => {
      if (cloud) {
        const postData = {
          version: fileData.version,
          time: fileData.time,
          size: fileData.size,
          backupUUID: fileData.backupUUID,
          gameId: fileData.gameId,
          gameVersion: fileData.gameVersion,
          addons: fileData.addons,
          uuid: fileData.uuid,
          hostname: fileData.hostname,
        };
        const axiosConfig = {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': `Singularity-${app.getVersion()}`,
            'x-auth': getAccessToken(),
          },
        };
        event.sender.send('backup-status', 'Saving Addon Backup To Cloud');
        event.sender.send('app-status-message', 'Saving addon backup to cloud', 'status');
        return axios.post(`${AppConfig.API_URL}/user/backup`, postData, axiosConfig)
          .then((res) => {
            if (res && res.status === 200 && res.data.success) {
              log.info('Cloud backup info saved');
              const { uploadUrl } = res.data;
              const putConfig = {
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                  'content-type': 'application/zip',
                  'User-Agent': `Singularity-${app.getVersion()}`,
                },
              };
              const dataBuf = Buffer.from(fileData.file, 'base64');
              log.info('Uploading settings file');
              event.sender.send('backup-status', 'Saving Settings Backup To Cloud');
              event.sender.send('app-status-message', 'Saving settings backup to cloud', 'status');
              return axios.put(uploadUrl, dataBuf, putConfig)
                .then((res2) => {
                  if (res2 && res2.status === 200) {
                    log.info('Settings uploaded, sending confirmation');
                    const confirmPostData = {
                      backupId: res.data.backupId,
                    };
                    const comirmPostConfig = {
                      headers: {
                        'Content-Type': 'application/json;charset=UTF-8',
                        'User-Agent': `Singularity-${app.getVersion()}`,
                        'x-auth': getAccessToken(),
                      },
                    };
                    return axios.post(`${AppConfig.API_URL}/user/confirmbackup`, confirmPostData, comirmPostConfig);
                  }
                  return Promise.resolve();
                })
                .then((res3) => {
                  if (res3) {
                    if (res3.status === 200) {
                      log.info('Confirmed settings upload');
                      event.sender.send('granular-backup-complete', true, 'cloud', gameId, gameVersion, null);
                      event.sender.send('app-status-message', 'Backup complete', 'success');
                    } else {
                      log.error('Error creating cloud backup');
                      event.sender.send('granular-backup-complete', false, 'cloud', gameId, gameVersion, null);
                      event.sender.send('app-status-message', 'Error saving backup', 'error');
                    }
                  }
                });
            }
            log.error('Error creating cloud backup');
            event.sender.send('granular-backup-complete', false, 'cloud', gameId, gameVersion, null);
            event.sender.send('app-status-message', 'Error saving backup', 'error');
            return Promise.resolve(null);
          });
      }
      event.sender.send('granular-backup-complete', true, 'local', gameId, gameVersion, null);
      event.sender.send('app-status-message', 'Error saving backup', 'error');
      return Promise.resolve(null);
    })
    .catch((err) => {
      log.error('Error creating cloud backup');
      log.error(err);
      event.sender.send('granular-backup-complete', false, 'cloud', gameId, gameVersion, null);
      event.sender.send('app-status-message', 'Error saving backup', 'error');
    });
});

ipcMain.on('delete-granular-backup', async (event, backup) => {
  log.info('Deleting granular backup');
  deleteLocalBackup(backup)
    .then(() => {
      if (backup.cloud) {
        log.info('Deleting cloud backup');
        const postData = {
          backupUUID: backup.backupUUID,
        };
        const axiosConfig = {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': `Singularity-${app.getVersion()}`,
            'x-auth': getAccessToken(),
          },
        };
        return axios.post(`${AppConfig.API_URL}/user/deletebackup`, postData, axiosConfig);
      }
      log.info('Local backup deleted');
      event.sender.send('delete-backup-complete', true, null);
      return Promise.resolve(null);
    })
    .then((res) => {
      if (res) {
        if (res.status === 200) {
          log.info('Cloud backup deleted');
          event.sender.send('delete-backup-complete', true, null);
        } else {
          log.error('Error deleting cloud backup');
          event.sender.send('delete-backup-complete', false, null);
        }
      }
    })
    .catch((err) => {
      log.error('Error deleting cloud backup');
      log.error(err);
      event.sender.send('delete-backup-complete', false, null);
    });
});

ipcMain.on('get-cloud-backups', async (event, gameId, gameVersion) => {
  if (isAuthenticated()) {
    log.info('Fetching cloud backups');
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-auth': getAccessToken(),
      },
    };
    axios.get(`${AppConfig.API_URL}/user/backups?gameId=${gameId}&gameVersion=${gameVersion}&version=2`, axiosConfig)
      .then((res) => {
        if (res.status === 200 && res.data.success) {
          log.info('Cloud backups found');
          event.sender.send('cloud-backups-found', true, gameId, gameVersion, res.data.backups, null);
        } else {
          log.info('No cloud backups found');
          event.sender.send('cloud-backups-found', false, gameId, gameVersion, null, 'No cloud backups found');
        }
      })
      .catch((err) => {
        log.error('Error fetching cloud backups');
        log.error(err);
        event.sender.send('cloud-backups-found', false, gameId, gameVersion, null, 'No cloud backups found');
      });
  } else {
    log.info('User is not authenticated, skipping cloud backup fetch');
    event.sender.send('cloud-backups-found', false, gameId, gameVersion, null, 'No cloud backups found');
  }
});

ipcMain.on('get-local-backups', (event, gameId, gameVersion) => {
  getBackupDataAsync(gameId.toString())
    .then((backupData) => {
      if (backupData) {
        event.sender.send('local-backups-found', true, gameId, gameVersion, backupData[gameVersion].backups, null);
      } else {
        event.sender.send('local-backups-found', true, gameId, gameVersion, [], null);
      }
    })
    .catch((err) => {
      log.error('Error retrieving local backups');
      log.error(err);
      event.sender.send('local-backups-found', false, gameId, gameVersion, null, 'Error searching for local backups');
    });
});

ipcMain.handle('get-backup-details', (event, backupUUID) => new Promise((resolve, reject) => {
  getLocalBackupDetails(backupUUID)
    .then((backupDetails) => resolve(backupDetails))
    .catch((error) => {
      log.error(error);
      return reject(new Error('Error retrieving backup details'));
    });
}));

ipcMain.on('restore-granular-backup', async (event, backup, includeSettings) => {
  log.info('Restoring granular backup');
  restoreGranularBackup(backup, includeSettings)
    .then(() => {
      event.sender.send('granular-restore-complete', true, null);
    })
    .catch((err) => {
      event.sender.send('granular-restore-complete', false, err);
    });
});
