const { app, BrowserWindow, ipcMain, autoUpdater, nativeTheme, menu, Menu, Tray } = require('electron');
const path = require('path');

// import services 
const appService = require('./services/app-service');
const storageService = require('./services/storage-service');
const authService = require('./services/auth-service');
const fileService = require('./services/file-service');

// import ipc handlers
var routes = require("./main-process");

const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.file.maxSize = 1024 * 1000;

var mainWindow;
var mainWindowId;
let tray = null;
let isQuitting = false;

const API_ENDPOINT = "https://api.singularitymods.com/api/v1/";
const PACKAGE_URL = "https://storage.singularitycdn.com/App/Releases/";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Start the auto-updater and configure it to check immediately and once
// every hour from then after.
const startAutoUpdater = () => {
    log.info('Starting Singularity Auto Updater');
    let beta = storageService.getAppData('userConfigurable').beta;
    //autoUpdater.logger = log;
    //autoUpdater.logger.transports.file.level = "info"
    if (process.platform === "win32") {
        // WINDOWS
        log.info('Initializing Auto Updater');
        // The Squirrel application will watch the provided URL
        autoUpdater.on("error", (event, error) => {
            log.error(error);
        });
        
        let feedURL = `${PACKAGE_URL}Win/`;
        if (beta) {
            feedURL = `${PACKAGE_URL}Win/Beta/`;
        }
        autoUpdater.setFeedURL(feedURL);

        // Unset the update pending notification, just in case it is still set
        autoUpdater.addListener('update-not-available', (event) => {
            storageService.setAppData('updatePending', false);
            //appData.set('updatePending', false);
        })

        // Notify the renderer that an update is pending
        autoUpdater.addListener("update-downloaded", (event, releaseNotes, releaseName) => {
            storageService.setAppData('updatePending', true);
            //appData.set('updatePending', true);
            if (mainWindow) {
                mainWindow.webContents.send('update-pending');
            }
            
        });

        autoUpdater.addListener("error", (event, error) => {
            log.error(error);
        });

        var cmds = process.argv;
        if (cmds.indexOf('--squirrel-firstrun') > -1) {
            // Skip auto update on first run
            log.info('First execution since install/update, stopping auto updater');
        } else {
            // Check for updates immediately
            try {
                autoUpdater.checkForUpdates()
            } catch (err) {
                log.error('Error checking for app update');
                log.error(err);
            }  
        } 

        // Also check once every hour
        setInterval(() => {
            log.info('Checking for app update');
            try {
                autoUpdater.checkForUpdates()
            } catch (err) {
                log.error('Error checking for app update');
                log.error(err);
            }   
        }, 1000 * 60 * 60);
        
    } else if (process.platform === "darwin") {
        // MACOS
        log.info('Initializing Auto Updater');
        autoUpdater.on("error", (event, error) => {
            log.error(error);
        });
        let feedURL = `${PACKAGE_URL}Mac/darwin-releases.json`
        if (beta) {
            feedURL = `${PACKAGE_URL}Mac/darwin-releases-beta.json`
        }
        autoUpdater.setFeedURL({url: feedURL, serverType:'json'});
        

        autoUpdater.addListener('update-not-available', (event) => {
            storageService.setAppData('updatePending', false);
        })

        // Notify the renderer that an update is pending
        autoUpdater.addListener("update-downloaded", (event, releaseNotes, releaseName) => {
            storageService.setAppData('updatePending', true);
            if (mainWindow) {
                mainWindow.webContents.send('update-pending');
            }
        });

        autoUpdater.addListener("error", (event, error) => {
            log.error(error);
        });

        var cmds = process.argv;
        if (cmds.indexOf('--squirrel-firstrun') > -1) {
            // Skip auto update on first run
            log.info('First execution since install/update, stopping auto updater');
        } else {
            // Check for updates immediately
            try {
                autoUpdater.checkForUpdates()
            } catch (err) {
                log.error('Error checking for app update');
                log.error(err);
            }  
        }

        // Also check once every hour
        setInterval(() => {
            log.info('Checking for app update');
            try {
                autoUpdater.checkForUpdates()
            } catch (err) {
                log.error('Error checking for app update');
                log.error(err);
            }   
        }, 1000 * 60 * 60);
        
    }  
}

// Handle creating a system tray
function createTray() {
    let appIcon = new Tray(path.join(__dirname, 'assets/icons/app_icon.png'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Singularity',
            click: function () {
                mainWindow.show();
            }
        },
        {
            label: 'Exit',
            click: function () {
                isQuitting = true;
                app.quit();
            }
        }
    ])
    appIcon.on('double-click', function (event) {
        mainWindow.show();
    });
    appIcon.setToolTip('Singularity');
    appIcon.setContextMenu(contextMenu);
    return appIcon;
}


// Create the main browser window for the renderer
const createWindow = () => {
    log.info('Create browser window');
    let frame = (process.platform === 'win32') 
        ? !app.isPackaged 
        : (process.platform === 'darwin')
            ? true
            : true
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
      frame: frame
   });
    mainWindowId = mainWindow.id;
    authService.setBrowserWindow(mainWindowId);
    fileService.setBrowserWindow(mainWindowId);

    // Set the user and OS theme in the browser window
    let userTheme = storageService.getAppData('userConfigurable').darkMode ? 'dark' : 'light';
    let osTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow.webContents.executeJavaScript(`localStorage.setItem('user_theme','${userTheme}')`);
    mainWindow.webContents.executeJavaScript(`localStorage.setItem('os_theme','${osTheme}')`);
    mainWindow.webContents.executeJavaScript(`__setTheme()`)

    // Load the app entry point
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    // Set a listener for external link clicks and open them in the user's main browser instead of the app
    mainWindow.webContents.on('new-window', function (e, url) {
        e.preventDefault();
        require('electron').shell.openExternal(url);
    });

    // Set a listener for updates to the user's OS theme and update the app.
    nativeTheme.on('updated', function theThemeHasChanged() {
        let osTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
        mainWindow.webContents.executeJavaScript(`localStorage.setItem('os_theme','${osTheme}')`)
            .then(() => {
                mainWindow.webContents.executeJavaScript(`__setTheme()`)
            })

    })

    // Handle close to tray if user has it configured
    mainWindow.on('close', (event) => {
        if(process.platform == 'win32' && storageService.getAppData('userConfigurable').closeToTray && !isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            mainWindow.setSkipTaskbar(true);
            tray = createTray();
        }
    })

    mainWindow.on('show', (event) => {
        mainWindow.setSkipTaskbar(false);
        if (tray) {
            tray.destroy();
        }
    })
};



// Listener that is called once the app window is loaded
app.on('ready', () => {
    log.info('Singularity App Ready');
    storageService.initStorage();
    fileService.setAPIEndpoint(API_ENDPOINT);
    appService.setAPIEndpoint(API_ENDPOINT);
    appService.setAppConfig();
    
    // Start the auto-updater if the app isn't in development mode
    if (app.isPackaged) {
        startAutoUpdater();
    }

    // Create the main window
    createWindow();

     // Start the auth refresh and addon check procedures
    if (process.platform === 'win32') {
        var cmd = process.argv[1]; 
        if (cmd === '--squirrel-install' 
            || cmd === '--squirrel-updated'
            || cmd === '--squirrel-uninstall'
            || cmd === '--squirrel-obsolete') {
            log.info('Singularity is being updated or installed, skipping some features')
        } else {
            authService.refreshTokens()
            .then(() => {
            log.info('Authentication token refresh succesful');
            return fileService.handleSync()
            })
            .then(() => {
                mainWindow.webContents.send('addon-sync-search-complete');
                log.info('Finished searching for sync profiles');
                return fileService.findAndUpdateAddons()
            })
            .then( profiles => {
                fileService.updateSyncProfiles([...profiles]);
            })
            .catch(err => {
                mainWindow.webContents.send('addon-sync-search-complete');
                if (err == 'No Token') {
                    log.info('User does not have an authentication session to resume.');
                    fileService.findAndUpdateAddons()
                    .then(() => {
                        log.info('Finished identifying and updating addons.')
                    })
                    .catch(err => {
                        log.info('Error identifying and updating addons');
                    })
                } else {
                    log.info(err);  
                }      
            })
        }
    } else {
        authService.refreshTokens()
        .then(() => {
        log.info('Authentication token refresh succesful');
        return fileService.handleSync()
        })
        .then(() => {
            mainWindow.webContents.send('addon-sync-search-complete');
            log.info('Finished searching for sync profiles');
            return fileService.findAndUpdateAddons()
        })
        .then( profiles => {
            fileService.updateSyncProfiles([...profiles]);
        })
        .catch(err => {
            mainWindow.webContents.send('addon-sync-search-complete');
            if (err == 'No Token') {
                log.info('User does not have an authentication session to resume.');
                fileService.findAndUpdateAddons()
                .then(() => {
                    log.info('Finished identifying and updating addons.')
                })
                .catch(err => {
                    log.info('Error identifying and updating addons');
                })
            } else {
                log.info(err);  
            }      
        })
    }
     

    // Start the addon auto updater
    fileService.setAddonUpdateInterval();
});


// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform == 'darwin' && storageService.getAppData('userConfigurable').closeToTray) {
        return false;
    }
    app.quit();
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Display the app menu when triggered
ipcMain.on(`display-app-menu`, function (e, args) {
    if (isWindows && mainWindow) {
        menu.popup({
            window: mainWindow,
            x: args.x,
            y: args.y
        });
    }
});

// Main window controls
ipcMain.on('minimize-window', (event, args) => {
    if (mainWindow.minimizable) {
        mainWindow.minimize();
    }
});

ipcMain.on('maximize-window', (event, args) => {
    if (browserWindow.maximizable) {
        mainWindow.maximize();
    }
});

ipcMain.on('un-maximize-window', (event, args) => {
    mainWindow.unmaximize();
});

ipcMain.on('max-un-max-window', (event, args) => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        event.returnValue = mainWindow.isMaximized();
    } else {
        mainWindow.maximize();
        event.returnValue = mainWindow.isMaximized();
    }
});

ipcMain.on('is-maximized-window', (event, args) => {
    event.returnValue = mainWindow.isMaximized();
})

ipcMain.on('close-window', (event, args) => {
    mainWindow.close();
});


// Auto update control
ipcMain.on('install-pending-update', (event, args) => {
    if (storageService.getAppData('updatePending')) {
        storageService.setAppData('updatePending', false);
        try {
            isQuitting = true;
            autoUpdater.quitAndInstall();
        } catch (err) {
            log.error(err);
        }
    }
})







