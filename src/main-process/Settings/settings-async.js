import { app, ipcMain, autoUpdater, dialog } from 'electron';
import fs from 'fs';
import log from 'electron-log';
import path from 'path';

import AppConfig from '../../config/app.config';

import getMainBrowserWindow from '../../services/electron.service';
import { findInstalledWoWVersions, setAddonUpdateInterval } from '../../services/file.service';
import {
  getAppData,
  getGameSettings,
  setAppData,
  setGameSettings
} from '../../services/storage.service';

ipcMain.on('set-app-settings', (event, appSettings) => {
  let prevSettings = getAppData('userConfigurable');
  setAppData('userConfigurable', appSettings);
  let mainWindow = getMainBrowserWindow();
  if (prevSettings.darkMode != appSettings.darkMode) {
      let userTheme = appSettings.darkMode ? 'dark' : 'light';
      mainWindow.webContents.executeJavaScript(`localStorage.setItem('user_theme','${userTheme}')`)
          .then(() => {
              mainWindow.webContents.executeJavaScript(`__setTheme()`)
              event.sender.send('darkmode-toggle', appSettings.darkMode);
          });
  }
  if (app.isPackaged && prevSettings.beta != appSettings.beta) {
      if (process.platform == 'win32') {
          let feedURL = `${AppConfig.PACKAGE_URL}/Win/`
          if (appSettings.beta) {
              feedURL = `${AppConfig.PACKAGE_URL}/Win/Beta/`
          }
          autoUpdater.setFeedURL(feedURL);     
      } else if (process.platform == 'darwin') {
          let feedURL = `${AppConfig.PACKAGE_URL}/Mac/darwin-releases.json`
          if (appSettings.beta) {
              feedURL = `${AppConfig.PACKAGE_URL}/Mac/darwin-releases-beta.json`
          }
          autoUpdater.setFeedURL({url: feedURL, serverType:'json'});
      }
      autoUpdater.checkForUpdates();
  }
  if (prevSettings.addonUpdateInterval != appSettings.addonUpdateInterval) {
      setAddonUpdateInterval();
  }    
});

ipcMain.on('select-backup-dir', (event) => {
  log.info('Request to change backup directory');
  dialog.showOpenDialog({
      properties: ['openDirectory']
  }).then(result => {
      if (!result.canceled && result.filePaths) {
          event.sender.send('moving-backup-dir');
          try {
              log.info('Changing backup directory to: ' + result.filePaths[0]);
              fs.accessSync(result.filePaths[0], fs.constants.R_OK | fs.constants.W_OK);
              let userConfig = getAppData('userConfigurable');
              if (fs.existsSync(path.join(userConfig.backupDir, 'backup'))) {
                  log.info('Copying backup data to new directory');
                  ncp(path.join(userConfig.backupDir, 'backup'), path.join(result.filePaths[0], 'backup'), function (err) {
                      if (err) {
                          log.error(err);
                          event.sender.send('backup-dir-rejected', "Error moving existing backups to new directory.");
                      }
                      log.info('Finished copying backup data to new directory. Deleting old versions.');
                      fs.rmdir(path.join(userConfig.backupDir, 'backup'), { recursive: true }, (err) => {
                          if (err) {
                              log.error(err);
                              event.sender.send('backup-dir-rejected', "Error cleaning up old backup directory.");
                          }
                          log.info('Finished deleting old backup data.')
                          userConfig.backupDir = result.filePaths[0];
                          setAppData('userConfigurable', userConfig);
                          event.sender.send('backup-dir-accepted');
                      });
                  });
              } else {
                  log.info('No previous backup data to copy');
                  userConfig.backupDir = result.filePaths[0];
                  setAppData('userConfigurable', userConfig);
                  event.sender.send('backup-dir-accepted');
              }
          } catch (err) {
              log.error(err);
              event.sender.send('backup-dir-rejected', "We don't have permissions to write to that directory.");
          }
      } else {
          log.info('User exited window or file path not selected');
          event.sender.send('backup-dir-rejected', "");
      }
  }).catch(err => {
      log.error(err);
  })
});

ipcMain.on('toggle-sidebar', (event, toggle) => {
  log.info('Saving sidebar toggle minimized: ' + toggle);
  setAppData('sidebarMinimized', toggle);
});

ipcMain.on('update-wow-path', (event, gameVersion) => {
  var gameId = 1;
  dialog.showOpenDialog({
      properties: ['openDirectory']
  }).then(result => {
      if (!result.canceled && result.filePaths) {
          var installedVersions = findInstalledWoWVersions(result.filePaths[0]);
          if (installedVersions && installedVersions.length > 0) {
              let currentSettings = getGameSettings(gameId.toString());
              if (installedVersions.includes(gameVersion)) {                                
                  currentSettings[gameVersion].installed = true;
                  switch (gameVersion) {
                      case 'wow_retail':
                          if (!result.filePaths[0].includes('_retail_')) {
                              var p = path.join(result.filePaths[0], '_retail_');
                          } else {
                              var p = result.filePaths[0];
                          }
                          break;
                      case 'wow_classic':
                          if (!result.filePaths[0].includes('_classic_')) {
                              var p = path.join(result.filePaths[0], '_classic_');
                          } else {
                              var p = result.filePaths[0];
                          }
                          break;
                      case 'wow_retail_ptr':
                          if (!result.filePaths[0].includes('_ptr_')) {
                              var p = path.join(result.filePaths[0], '_ptr_');
                          } else {
                              var p = result.filePaths[0];
                          }
                          break;
                      case 'wow_classic_ptr':
                          if (!result.filePaths[0].includes('_classic_ptr_')) {
                              var p = path.join(result.filePaths[0], '_classic_ptr_');
                          } else {
                              var p = result.filePaths[0];
                          }
                          break;
                      case 'wow_retail_beta':
                          if (!result.filePaths[0].includes('_beta_')) {
                              var p = path.join(result.filePaths[0], '_beta_');
                          } else {
                              var p = result.filePaths[0];
                          }
                          break;
                  }
                  currentSettings[gameVersion].installPath = p;
                  setGameSettings(gameId.toString(), currentSettings);
                  event.sender.send('installation-path-updated', gameVersion, p);
              } else {
                  event.sender.send('installation-not-found', gameVersion);
              }
          } else {
              event.sender.send('installation-not-found', gameVersion);
          }
      }
  }).catch(err => {
      log.error(err);
      event.sender.send('installation-not-found', gameVersion);
  })
});