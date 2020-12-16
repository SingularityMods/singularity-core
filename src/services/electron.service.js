import { app, autoUpdater, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import log from 'electron-log';
import fs from 'fs';
import { download } from 'electron-dl';

import AppConfig from '../config/app.config';
import {
  getAppData,
  setAppData,
} from './storage.service';

let appWindow;

function getMainBrowserWindow() {
  const mainWindow = BrowserWindow.getAllWindows();
  if (
    mainWindow === 'undefined'
    || mainWindow === null
    || mainWindow[mainWindow.length - 1] === 'undefined'
    || mainWindow[mainWindow.length - 1] === null
  ) {
    return null;
  }
  return mainWindow[mainWindow.length - 1];
}

function run(args, done) {
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  spawn(updateExe, args, {
    detached: true,
  }).on('close', () => done());
}

function checkForSquirrels() {
  if (process.platform === 'win32') {
    const cmd = process.argv[1];
    const target = path.basename(process.execPath);

    if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
      run([`--createShortcut=${target}`], app.quit);
      return true;
    }
    if (cmd === '--squirrel-uninstall') {
      run([`--removeShortcut=${target}`], app.quit);
      return true;
    }
    if (cmd === '--squirrel-obsolete') {
      app.quit();
      return true;
    }
  }
  return false;
}

function getLatestAppVersion() {
  return new Promise((resolve, reject) => {
    const { beta } = getAppData('userConfigurable');
    const { platform } = process;
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': `Singularity-${app.getVersion()}`,
        'x-app-uuid': getAppData('UUID'),
      },
    };
    axios.get(`https://api.singularitymods.com/api/v1/app/latest?platform=${platform}&beta=${beta}`, axiosConfig)
      .then((res) => {
        if (res.status === 200) {
          const latestVersion = res.data;
          return resolve(latestVersion);
        }
        log.info('Unable to find latest Singularity version');
        return reject(new Error('Unable to find latest Singularity version'));
      })
      .catch((err) => {
        log.error('Error while finding latest Singularity version');
        log.error(err);
        return reject(new Error('Error while finding latest Singularity version'));
      });
  });
}

function downloadLatestAppVersion(window, version) {
  return new Promise((resolve, reject) => {
    const { beta } = getAppData('userConfigurable');
    appWindow = window;
    let fileName;
    let manifestName;
    let updateFilePath;
    let updateFeedPath;
    let feedUrl;
    // Create a temporary directory for the download if it doesn't exist
    const tempPath = path.join(app.getPath('temp'), 'Singularity-Update');
    if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath);
    if (process.platform === 'win32') {
      fileName = `Singularity-${version}-full.nupkg`;
      manifestName = 'RELEASES';
      if (beta) {
        updateFilePath = `${AppConfig.PACKAGE_URL}/Win/Beta/${fileName}`;
        updateFeedPath = `${AppConfig.PACKAGE_URL}/Win/Beta/${manifestName}`;
      } else {
        updateFilePath = `${AppConfig.PACKAGE_URL}/Win/Alpha/${fileName}`; // TODO: REMOVE ALPHA
        updateFeedPath = `${AppConfig.PACKAGE_URL}/Win/Alpha/${manifestName}`;
      }
      feedUrl = { url: tempPath };
    } else if (process.platform === 'darwin') {
      fileName = `Singularity-darwin-x64-${version}.zip`;
      updateFilePath = `${AppConfig.PACKAGE_URL}/Mac/${fileName}`;
      if (beta) {
        manifestName = 'darwin-releases-beta.json';
      } else {
        manifestName = 'darwin-releases.json';
      }
      updateFeedPath = `${AppConfig.PACKAGE_URL}/Mac/${manifestName}`;
      feedUrl = { url: `file://${tempPath}/${manifestName}`, serverType: 'json' };
    }
    if (fs.existsSync(path.join(tempPath, fileName))) {
      fs.unlinkSync(path.join(tempPath, fileName));
    }
    if (fs.existsSync(path.join(tempPath, manifestName))) {
      fs.unlinkSync(path.join(tempPath, manifestName));
    }
    const fileOpts = {
      onProgress: _relayProgress,
      directory: tempPath,
    };
    const feedOpts = {
      directory: tempPath,
    };
    log.info(updateFilePath);
    download(appWindow, updateFilePath, fileOpts)
      .then(() => {
        log.info('Update downloaded');
        return download(appWindow, updateFeedPath, feedOpts);
      })
      .then(() => {
        log.info('Manifest downloaded');
        return resolve(feedUrl);
      })
      .catch((err) => {
        log.error('Error downloading update');
        log.error(err);
        return reject(new Error('Error downloading update'));
      });
  });
}

function runAutoUpdater(window, inStartup) {
  return new Promise((resolve) => {
    if (!app.isPackaged) {
      return resolve();
    }
    log.info('Running Singularity Auto Updater');
    const cmds = process.argv;
    if (process.platform === 'win32' && cmds.indexOf('--squirrel-firstrun') > -1) {
      // First execution since installing or updating, restart so we can check for updates
      log.info('First execution since install/update, restarting app to free locks');
      app.relaunch({ args: [] });
      return app.quit();
    }
    // Check for updates right now
    if (window) {
      window.webContents.send('startup-state', 'update-checking');
    }
    return getLatestAppVersion()
      .then((latestVersion) => {
        if (app.getVersion() < latestVersion) {
          // Update Available
          log.info(`New Singularity version available: ${latestVersion}`);
          return downloadLatestAppVersion(window, latestVersion)
            .then((feedUrl) => {
              autoUpdater.setFeedURL(feedUrl);

              autoUpdater.on('error', (event, error) => {
                log.error(error);
                return resolve();
              });

              autoUpdater.on('update-available', () => {
                if (window) {
                  window.webContents.send('startup-state', 'update-installing');
                }
              });

              autoUpdater.on('update-not-available', () => {
                log.error('Update not available after downloading...');
                return resolve();
              });

              // Notify the renderer that an update is pending
              autoUpdater.on('update-downloaded', () => {
                if (inStartup) {
                  log.info('Restarting Singularity to install update');
                  autoUpdater.quitAndInstall();
                } else {
                  setAppData('updatePending', true);
                  if (window) {
                    window.webContents.send('update-pending');
                  }
                }
              });

              try {
                return autoUpdater.checkForUpdates();
              } catch (err) {
                log.error('Error checking for app update');
                log.error(err);
                return resolve();
              }
            });
        }
        // On the latest version already
        log.info('Singularity is already on the latest version');
        if (window) {
          window.webContents.send('startup-state', 'update-none');
        }
        const tempPath = path.join(app.getPath('temp'), 'Singularity-Update');
        if (fs.existsSync(tempPath)) {
          return fs.rmdir(tempPath, { recursive: true })
            .then(() => resolve());
        }
        return resolve();
      })
      .catch((err) => {
        log.error(err);
        return resolve();
      });
  });
}

function _relayProgress(progress) {
  const perc = Math.round(progress.percent * 100);
  const percentage = `${perc.toString()}%`;
  if (appWindow) {
    appWindow.webContents.send('startup-state', 'update-downloading', percentage);
  }
  log.info(`Update download percentage: ${percentage}`);
}

export {
  checkForSquirrels,
  downloadLatestAppVersion,
  getLatestAppVersion,
  getMainBrowserWindow,
  runAutoUpdater,
};
