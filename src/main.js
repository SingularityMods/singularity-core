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

import { setAppConfig } from './services/app.service';
import {
  checkForSquirrels,
  runAutoUpdater,
} from './services/electron.service';
import { isAuthenticated, refreshTokens } from './services/auth.service';
import {
  findAndUpdateAddons,
  handleSync,
  setAddonUpdateInterval,
  updateSyncProfiles,
  handleProtocolUrl,
} from './services/file.service';
import { initStorage, getAppData, setAppData } from './services/storage.service';
import {
  initSentry,
  enableSentry,
} from './services/sentry.service';
import {
  checkForWagoUpdates,
} from './services/wago.service';

// import ipc handlers
require('./main-process');

// Set logging
log.transports.file.level = 'info';
log.transports.file.maxSize = 1024 * 1000;

let mainWindow;
let splash;
let tray = null;
let isQuitting = false;
let mainWindowReady = false;
let launchProtocolUrl;

const appLock = app.requestSingleInstanceLock();

if (!appLock) {
  log.info('Singularity already running, quit new instance.');
  app.quit();
} else {
  app.on('second-instance', (_event, args) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const protocolUrl = checkForProtocolUrl(args);
    if (protocolUrl) {
      handleProtocolUrl(protocolUrl);
    }
  });

  // Init sentry but disable telemetry until the user opts in
  initSentry();

  // Handle creating/removing shortcuts on Windows when installing/uninstalling.
  if (checkForSquirrels()) {
    isQuitting = true;
    app.quit();
  }

  // Listener that is called once the app window is loaded
  app.on('ready', () => {
    log.info('Singularity App Ready');

    // Start the auth refresh and addon check procedures
    if (process.platform === 'win32') {
      const cmd = process.argv[1];
      if (cmd === '--squirrel-install'
            || cmd === '--squirrel-updated'
            || cmd === '--squirrel-uninstall'
            || cmd === '--squirrel-obsolete') {
        log.info('Singularity is being updated or installed, skipping pausing app launch');

      // createWindow();
      } else {
      // Create splash window
        createSplashWindow();
        // Initialize Storage

        initStorage();
        setAppConfig();
        const {
          telemetry,
          beta,
        } = getAppData('userConfigurable');
        if (telemetry || beta) {
          enableSentry();
        }
        runAutoUpdater(splash, true)
          .then(() => {
            createWindow();
          })
          .then(() => refreshTokens())
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
          .then(() => {
            showMainWindow();
          })
          .catch((err) => {
            mainWindow.webContents.send('addon-sync-search-complete');
            if (err.message === 'No Token') {
              log.info('User does not have an authentication session to resume.');
              findAndUpdateAddons()
                .then(() => {
                  log.info('Finished identifying and updating addons.');
                  showMainWindow();
                })
                .catch(() => {
                  log.info('Error identifying and updating addons');
                  showMainWindow();
                });
            } else {
              log.info(err.message);
              showMainWindow();
            }
          });
      }
    } else {
    // Create splash window
      createSplashWindow();
      // Initialize Storage
      initStorage();
      setAppConfig();
      const {
        telemetry,
        beta,
      } = getAppData('userConfigurable');
      if (telemetry || beta) {
        enableSentry();
      }
      runAutoUpdater(splash, true)
        .then(() => {
          createWindow();
        })
        .then(() => refreshTokens())
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
        .then(() => {
          showMainWindow();
        })
        .catch((err) => {
          mainWindow.webContents.send('addon-sync-search-complete');
          if (err.message === 'No Token') {
            log.info('User does not have an authentication session to resume.');
            findAndUpdateAddons()
              .then(() => {
                log.info('Finished identifying and updating addons.');
                showMainWindow();
              })
              .catch(() => {
                log.info('Error identifying and updating addons');
                showMainWindow();
              });
          } else {
            log.info(err.message);
            showMainWindow();
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

  if (!app.isDefaultProtocolClient('singularity')) {
    app.setAsDefaultProtocolClient('singularity');
  }

  app.on('will-finish-launching', () => {
    app.on('open-url', (event, data) => {
      event.preventDefault();
      launchProtocolUrl = data;
    });
  });

  app.on('open-url', (event, data) => {
    event.preventDefault();
    handleProtocolUrl(data);
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
}

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

function createSplashWindow() {
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      devTools: false,
      preload: SPLASH_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });
  splash.loadURL(SPLASH_WINDOW_WEBPACK_ENTRY);
  log.info('Splash loaded');
  splash.on('closed', () => {
    splash = null;
  });
}

function showMainWindow() {
  if (mainWindowReady) {
    checkForWagoUpdates();
    log.info('Hide splash and show main window');
    if (isAuthenticated()) {
      mainWindow.webContents.send('auth-event', 'refresh', true, null);
    }
    if (splash) {
      splash.destroy();
    } else {
      log.error('Unable to destroy splash window, should still exist');
    }
    mainWindow.show();
    const protocolUrl = launchProtocolUrl || checkForProtocolUrl(process.argv);
    if (protocolUrl) {
      handleProtocolUrl(protocolUrl);
    }
  } else {
    log.info('Waiting for main window to be ready');
    setTimeout(showMainWindow, 1000);
  }
}

// Create the main browser window for the renderer
function createWindow() {
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
    show: false,
  });

  // Load the app entry point
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.once('ready-to-show', () => {
    log.info('Main window set');
    mainWindowReady = true;
    // Set the user and OS theme in the browser window
    const userTheme = getAppData('userConfigurable').darkMode ? 'dark' : 'light';
    const osTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow.webContents.executeJavaScript(`localStorage.setItem('user_theme','${userTheme}')`)
      .then(() => mainWindow.webContents.executeJavaScript(`localStorage.setItem('os_theme','${osTheme}')`))
      .then(() => mainWindow.webContents.executeJavaScript('__setTheme()'))
      .catch((error) => {
        log.error('Error executing javascript in main window');
        log.error(error.message);
      });
  });

  // Set a listener for external link clicks and open them
  // in the user's main browser instead of the app
  mainWindow.webContents.on('new-window', (e, url) => {
    e.preventDefault();
    shell.openExternal(url);
  });

  // Set a listener for updates to the user's OS theme and update the app.
  nativeTheme.on('updated', () => {
    const osTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow.webContents.executeJavaScript(`localStorage.setItem('os_theme','${osTheme}')`)
      .then(() => {
        mainWindow.webContents.executeJavaScript('__setTheme()');
      })
      .catch((error) => {
        log.error('Error executing javascript in main window');
        log.error(error.message);
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
  setInterval(() => {
    let window = mainWindow;
    let newWinCreated = false;
    if (!window) {
      window = new BrowserWindow({ height: 0, width: 0, show: false });
      newWinCreated = true;
    }
    runAutoUpdater(window, false)
      .then(() => {
        if (newWinCreated) {
          window.close();
        }
      });
  }, 1000 * 60 * 60);
}

function checkForProtocolUrl(args) {
  if (!args) {
    return null;
  }
  let protocolUrl;
  args.forEach((arg) => {
    if (arg.includes('singularity://')) {
      protocolUrl = arg;
    }
  });
  return protocolUrl;
}
