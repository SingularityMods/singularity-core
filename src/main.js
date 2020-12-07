import {
  app,
  BrowserWindow,
  ipcMain,
  autoUpdater,
  nativeTheme,
  menu,
  Menu,
  shell,
  Tray,
} from 'electron';
import path from 'path';
import log from 'electron-log';

import AppConfig from './config/app.config';
import { setAppConfig } from './services/app.service';
import { initStorage, getAppData, setAppData } from './services/storage.service';
import { refreshTokens } from './services/auth.service';
import {
  findAndUpdateAddons,
  handleSync,
  setAddonUpdateInterval,
  updateSyncProfiles,
} from './services/file.service';

// import ipc handlers
require('./main-process');

log.transports.file.level = 'info';
log.transports.file.maxSize = 1024 * 1000;

let mainWindow;
let tray = null;
let isQuitting = false;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Start the auto-updater and configure it to check immediately and once
// every hour from then after.
const startAutoUpdater = () => {
  log.info('Starting Singularity Auto Updater');
  const { beta } = getAppData('userConfigurable');
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  if (process.platform === 'win32') {
    // WINDOWS
    log.info('Initializing Auto Updater');
    // The Squirrel application will watch the provided URL
    autoUpdater.on('error', (event, error) => {
      log.error(error);
    });

    let feedURL = `${AppConfig.PACKAGE_URL}/Win/`;
    if (beta) {
      feedURL = `${AppConfig.PACKAGE_URL}/Win/Beta/`;
    }
    autoUpdater.setFeedURL(feedURL);

    // Unset the update pending notification, just in case it is still set
    autoUpdater.addListener('update-not-available', () => {
      setAppData('updatePending', false);
    });

    // Notify the renderer that an update is pending
    autoUpdater.addListener('update-downloaded', () => {
      setAppData('updatePending', true);
      if (mainWindow) {
        mainWindow.webContents.send('update-pending');
      }
    });

    autoUpdater.addListener('error', (event, error) => {
      log.error(error);
    });

    const cmds = process.argv;
    if (cmds.indexOf('--squirrel-firstrun') > -1) {
      // Skip auto update on first run
      log.info('First execution since install/update, stopping auto updater');
    } else {
      // Check for updates immediately
      try {
        autoUpdater.checkForUpdates();
      } catch (err) {
        log.error('Error checking for app update');
        log.error(err);
      }
    }

    // Also check once every hour
    setInterval(() => {
      log.info('Checking for app update');
      try {
        autoUpdater.checkForUpdates();
      } catch (err) {
        log.error('Error checking for app update');
        log.error(err);
      }
    }, 1000 * 60 * 60);
  } else if (process.platform === 'darwin') {
    // MACOS
    log.info('Initializing Auto Updater');
    autoUpdater.on('error', (event, error) => {
      log.error(error);
    });
    let feedURL = `${AppConfig.PACKAGE_URL}/Mac/darwin-releases.json`;
    if (beta) {
      feedURL = `${AppConfig.PACKAGE_URL}/Mac/darwin-releases-beta.json`;
    }
    autoUpdater.setFeedURL({ url: feedURL, serverType: 'json' });

    autoUpdater.addListener('update-not-available', () => {
      setAppData('updatePending', false);
    });

    // Notify the renderer that an update is pending
    autoUpdater.addListener('update-downloaded', () => {
      setAppData('updatePending', true);
      if (mainWindow) {
        mainWindow.webContents.send('update-pending');
      }
    });

    autoUpdater.addListener('error', (event, error) => {
      log.error(error);
    });

    const cmds = process.argv;
    if (cmds.indexOf('--squirrel-firstrun') > -1) {
      // Skip auto update on first run
      log.info('First execution since install/update, stopping auto updater');
    } else {
      // Check for updates immediately
      try {
        autoUpdater.checkForUpdates();
      } catch (err) {
        log.error('Error checking for app update');
        log.error(err);
      }
    }

    // Also check once every hour
    setInterval(() => {
      log.info('Checking for app update');
      try {
        autoUpdater.checkForUpdates();
      } catch (err) {
        log.error('Error checking for app update');
        log.error(err);
      }
    }, 1000 * 60 * 60);
  }
};

// Handle creating a system tray
function createTray() {
  const appIcon = new Tray(path.join(__dirname, 'assets/icons/app_icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Singularity',
      click() {
        mainWindow.show();
      },
    },
    {
      label: 'Exit',
      click() {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  appIcon.on('double-click', () => {
    mainWindow.show();
  });
  appIcon.setToolTip('Singularity');
  appIcon.setContextMenu(contextMenu);
  return appIcon;
}

// Create the main browser window for the renderer
const createWindow = () => {
  log.info('Create browser window');
  const frame = (process.platform === 'win32')
    ? !app.isPackaged
    : true;

  // Initialize the main window
  mainWindow = new BrowserWindow({
    height: 700,
    width: 1090,
    minWidth: 900,
    minHeight: 550,
    webPreferences: {
      nodeIntegration: true,
      devTools: !app.isPackaged,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    icon: path.join(__dirname, 'assets/icons/app_icon.png'),
    frame,
  });

  // Set the user and OS theme in the browser window
  const userTheme = getAppData('userConfigurable').darkMode ? 'dark' : 'light';
  let osTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  mainWindow.webContents.executeJavaScript(`localStorage.setItem('user_theme','${userTheme}')`);
  mainWindow.webContents.executeJavaScript(`localStorage.setItem('os_theme','${osTheme}')`);
  mainWindow.webContents.executeJavaScript('__setTheme()');

  // Load the app entry point
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Set a listener for external link clicks and open them
  // in the user's main browser instead of the app
  mainWindow.webContents.on('new-window', (e, url) => {
    e.preventDefault();
    shell.openExternal(url);
  });

  // Set a listener for updates to the user's OS theme and update the app.
  nativeTheme.on('updated', () => {
    osTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow.webContents.executeJavaScript(`localStorage.setItem('os_theme','${osTheme}')`)
      .then(() => {
        mainWindow.webContents.executeJavaScript('__setTheme()');
      });
  });

  // Handle close to tray if user has it configured
  mainWindow.on('close', (event) => {
    if (process.platform === 'win32' && getAppData('userConfigurable').closeToTray && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
      tray = createTray();
    }
  });

  mainWindow.on('show', () => {
    mainWindow.setSkipTaskbar(false);
    if (tray) {
      tray.destroy();
    }
  });
};

// Listener that is called once the app window is loaded
app.on('ready', () => {
  log.info('Singularity App Ready');
  initStorage();
  setAppConfig();

  // Start the auto-updater if the app isn't in development mode
  if (app.isPackaged) {
    startAutoUpdater();
  }

  // Create the main window
  createWindow();

  // Start the auth refresh and addon check procedures
  if (process.platform === 'win32') {
    const cmd = process.argv[1];
    if (cmd === '--squirrel-install'
            || cmd === '--squirrel-updated'
            || cmd === '--squirrel-uninstall'
            || cmd === '--squirrel-obsolete') {
      log.info('Singularity is being updated or installed, skipping some features');
    } else {
      refreshTokens()
        .then(() => {
          log.info('Authentication token refresh succesful');
          return handleSync();
        })
        .then(() => {
          mainWindow.webContents.send('addon-sync-search-complete');
          log.info('Finished searching for sync profiles');
          return findAndUpdateAddons();
        })
        .then((profiles) => {
          updateSyncProfiles([...profiles]);
        })
        .catch((err) => {
          mainWindow.webContents.send('addon-sync-search-complete');
          if (err.message === 'No Token') {
            log.info('User does not have an authentication session to resume.');
            findAndUpdateAddons()
              .then(() => {
                log.info('Finished identifying and updating addons.');
              })
              .catch(() => {
                log.info('Error identifying and updating addons');
              });
          } else {
            log.info(err.message);
          }
        });
    }
  } else {
    refreshTokens()
      .then(() => {
        log.info('Authentication token refresh succesful');
        return handleSync();
      })
      .then(() => {
        mainWindow.webContents.send('addon-sync-search-complete');
        log.info('Finished searching for sync profiles');
        return findAndUpdateAddons();
      })
      .then((profiles) => {
        updateSyncProfiles([...profiles]);
      })
      .catch((err) => {
        mainWindow.webContents.send('addon-sync-search-complete');
        if (err.message === 'No Token') {
          log.info('User does not have an authentication session to resume.');
          findAndUpdateAddons()
            .then(() => {
              log.info('Finished identifying and updating addons.');
            })
            .catch(() => {
              log.info('Error identifying and updating addons');
            });
        } else {
          log.info(err.message);
        }
      });
  }

  // Start the addon auto updater
  setAddonUpdateInterval();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform === 'darwin' && getAppData('userConfigurable').closeToTray) {
    return false;
  }
  return app.quit();
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Display the app menu when triggered
ipcMain.on('display-app-menu', (e, args) => {
  if (process.platform === 'win32' && mainWindow) {
    menu.popup({
      window: mainWindow,
      x: args.x,
      y: args.y,
    });
  }
});

// Main window controls
ipcMain.on('minimize-window', () => {
  if (mainWindow.minimizable) {
    mainWindow.minimize();
  }
});

ipcMain.on('maximize-window', () => {
  if (mainWindow.maximizable) {
    mainWindow.maximize();
  }
});

ipcMain.on('un-maximize-window', () => {
  mainWindow.unmaximize();
});

ipcMain.on('max-un-max-window', (event) => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    event.returnValue = mainWindow.isMaximized();
  } else {
    mainWindow.maximize();
    event.returnValue = mainWindow.isMaximized();
  }
});

ipcMain.on('is-maximized-window', (event) => {
  event.returnValue = mainWindow.isMaximized();
});

ipcMain.on('close-window', () => {
  mainWindow.close();
});

// Auto update control
ipcMain.on('install-pending-update', () => {
  if (getAppData('updatePending')) {
    setAppData('updatePending', false);
    try {
      isQuitting = true;
      autoUpdater.quitAndInstall();
    } catch (err) {
      log.error(err);
    }
  }
});
