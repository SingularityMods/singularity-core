import {
  app, ipcMain, autoUpdater, dialog,
} from 'electron';
import fs from 'fs';
import log from 'electron-log';
import path from 'path';
import ncp from 'ncp';

import AppConfig from '../../config/app.config';

import getMainBrowserWindow from '../../services/electron.service';
import {
  findInstalledGame,
  findInstalledWoWVersions,
  setAddonUpdateInterval,
  updateESOAddonPath,
} from '../../services/file.service';
import {
  getAppData,
  getGameData,
  getGameSettings,
  setAppData,
  setGameSettings,
} from '../../services/storage.service';

ipcMain.on('set-app-settings', (event, appSettings) => {
  const prevSettings = getAppData('userConfigurable');
  setAppData('userConfigurable', appSettings);
  const mainWindow = getMainBrowserWindow();
  if (prevSettings.darkMode !== appSettings.darkMode) {
    const userTheme = appSettings.darkMode ? 'dark' : 'light';
    mainWindow.webContents.executeJavaScript(`localStorage.setItem('user_theme','${userTheme}')`)
      .then(() => {
        mainWindow.webContents.executeJavaScript('__setTheme()');
        event.sender.send('darkmode-toggle', appSettings.darkMode);
      });
  }
  if (app.isPackaged && prevSettings.beta !== appSettings.beta) {
    if (process.platform === 'win32') {
      let feedURL = `${AppConfig.PACKAGE_URL}/Win/`;
      if (appSettings.beta) {
        feedURL = `${AppConfig.PACKAGE_URL}/Win/Beta/`;
      }
      autoUpdater.setFeedURL(feedURL);
    } else if (process.platform === 'darwin') {
      let feedURL = `${AppConfig.PACKAGE_URL}/Mac/darwin-releases.json`;
      if (appSettings.beta) {
        feedURL = `${AppConfig.PACKAGE_URL}/Mac/darwin-releases-beta.json`;
      }
      autoUpdater.setFeedURL({ url: feedURL, serverType: 'json' });
    }
    autoUpdater.checkForUpdates();
  }
  if (prevSettings.addonUpdateInterval !== appSettings.addonUpdateInterval) {
    setAddonUpdateInterval();
  }
});

ipcMain.on('select-backup-dir', (event) => {
  log.info('Request to change backup directory');
  dialog.showOpenDialog({
    properties: ['openDirectory'],
  }).then((result) => {
    if (!result.canceled && result.filePaths) {
      event.sender.send('moving-backup-dir');
      try {
        log.info(`Changing backup directory to: ${result.filePaths[0]}`);
        fs.accessSync(result.filePaths[0], fs.constants.R_OK | fs.constants.W_OK);
        const userConfig = getAppData('userConfigurable');
        if (fs.existsSync(path.join(userConfig.backupDir, 'backup'))) {
          log.info('Copying backup data to new directory');
          ncp(path.join(userConfig.backupDir, 'backup'), path.join(result.filePaths[0], 'backup'), (err) => {
            if (err) {
              log.error(err);
              event.sender.send('backup-dir-rejected', 'Error moving existing backups to new directory.');
            }
            log.info('Finished copying backup data to new directory. Deleting old versions.');
            fs.rmdir(path.join(userConfig.backupDir, 'backup'), { recursive: true }, (rmdirErr) => {
              if (rmdirErr) {
                log.error(rmdirErr);
                event.sender.send('backup-dir-rejected', 'Error cleaning up old backup directory.');
              }
              log.info('Finished deleting old backup data.');
              const [backupDir] = result.filePaths;
              userConfig.backupDir = backupDir;
              setAppData('userConfigurable', userConfig);
              event.sender.send('backup-dir-accepted');
            });
          });
        } else {
          log.info('No previous backup data to copy');
          const [backupDir] = result.filePaths;
          userConfig.backupDir = backupDir;
          setAppData('userConfigurable', userConfig);
          event.sender.send('backup-dir-accepted');
        }
      } catch (err) {
        log.error(err);
        event.sender.send('backup-dir-rejected', "We don't have permissions to write to that directory.");
      }
    } else {
      log.info('User exited window or file path not selected');
      event.sender.send('backup-dir-rejected', '');
    }
  }).catch((err) => {
    log.error(err);
  });
});

ipcMain.on('toggle-sidebar', (event, toggle) => {
  log.info(`Saving sidebar toggle minimized: ${toggle}`);
  setAppData('sidebarMinimized', toggle);
});

ipcMain.handle('update-eso-addon-path', () => new Promise((resolve, reject) => {
  dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
    .then((result) => {
      if (result.canceled) {
        return resolve({
          success: true,
          message: '',
        });
      } if (!result.filePaths) {
        return resolve({
          success: false,
          message: 'Select the directory where your game is installed',
        });
      }
      const [resultPath] = result.filePaths;
      return updateESOAddonPath(resultPath)
        .then(() => resolve({
          success: true,
        }));
    })
    .catch((err) => {
      log.error(err);
      return reject(new Error('Error updating path'));
    });
}));

ipcMain.handle('update-eso-install-path', () => new Promise((resolve, reject) => {
  dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
    .then((result) => {
      if (result.canceled) {
        return resolve({
          success: true,
          message: '',
        });
      } if (!result.filePaths) {
        return resolve({
          success: false,
          message: 'Select the directory where your game is installed',
        });
      }
      const [resultPath] = result.filePaths;
      return findInstalledGame('2', resultPath)
        .then((installedVersions) => {
          if (installedVersions && installedVersions.length > 0) {
            return resolve({
              success: true,
              message: '',
              path: resultPath,
            });
          }
          return resolve({
            success: false,
            message: 'Could not find the game in that directory',
          });
        })
        .catch(() => resolve({
          success: false,
          message: 'Could not find the game in that directory',
        }));
    })
    .catch((err) => {
      log.error(err);
      return reject(new Error('Error updating path'));
    });
}));

ipcMain.on('update-wow-path', (event, gameVersion) => {
  const gameId = 1;
  dialog.showOpenDialog({
    properties: ['openDirectory'],
  }).then((result) => {
    if (!result.canceled && result.filePaths) {
      const installedVersions = findInstalledWoWVersions(result.filePaths[0]);
      if (installedVersions && installedVersions.length > 0) {
        const currentSettings = getGameSettings(gameId.toString());
        const gameD = getGameData(gameId.toString());
        if (installedVersions.includes(gameVersion)) {
          currentSettings[gameVersion].installed = true;
          let p;
          const [resultPath] = result.filePaths;
          switch (gameVersion) {
            case 'wow_retail':
              if (!resultPath.includes('_retail_')) {
                p = path.join(resultPath, '_retail_');
              } else {
                p = resultPath;
              }
              break;
            case 'wow_classic':
              if (!resultPath.includes('_classic_')) {
                p = path.join(resultPath, '_classic_');
              } else {
                p = resultPath;
              }
              break;
            case 'wow_retail_ptr':
              if (!resultPath.includes('_ptr_')) {
                p = path.join(resultPath, '_ptr_');
              } else {
                p = resultPath;
              }
              break;
            case 'wow_classic_ptr':
              if (!resultPath.includes('_classic_ptr_')) {
                p = path.join(resultPath, '_classic_ptr_');
              } else {
                p = resultPath;
              }
              break;
            case 'wow_retail_beta':
              if (!resultPath.includes('_beta_')) {
                p = path.join(resultPath, '_beta_');
              } else {
                p = resultPath;
              }
              break;
            case 'wow_classic_beta':
              if (!resultPath.includes('_classic_beta_')) {
                p = path.join(resultPath, '_classic_beta_');
              } else {
                p = resultPath;
              }
              break;
            default:
              if (!resultPath.includes('_retail_')) {
                p = path.join(resultPath, '_retail_');
              } else {
                p = resultPath;
              }
              break;
          }
          currentSettings[gameVersion].installPath = p;
          currentSettings[gameVersion].addonPath = path.join(p,gameD.addonDir);
          currentSettings[gameVersion].settingsPath = path.join(p,gameD.settingsDir);
          setGameSettings(gameId.toString(), currentSettings);
          event.sender.send('installation-path-updated', gameVersion, p);
        } else {
          event.sender.send('installation-not-found', gameVersion);
        }
      } else {
        event.sender.send('installation-not-found', gameVersion);
      }
    }
  }).catch((err) => {
    log.error(err);
    event.sender.send('installation-not-found', gameVersion);
  });
});
