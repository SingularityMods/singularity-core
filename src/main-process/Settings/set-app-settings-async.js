const { app, ipcMain, BrowserWindow, autoUpdater } = require('electron');
const storageService = require('../../services/storage-service');
const fileService = require('../../services/file-service');

const log = require('electron-log');

const PACKAGE_URL = "https://storage.singularitycdn.com/App/Releases/";

ipcMain.on('set-app-settings', (event, appSettings) => {
    let prevSettings = storageService.getAppData('userConfigurable');
    storageService.setAppData('userConfigurable', appSettings);
    let mainWindow = BrowserWindow.getFocusedWindow();
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
            let feedURL = `${PACKAGE_URL}Win/`
            if (appSettings.beta) {
                feedURL = `${PACKAGE_URL}Win/Beta/`
            }
            autoUpdater.setFeedURL(feedUrl);     
        } else if (process.platform == 'darwin') {
            let feedURL = `${PACKAGE_URL}Mac/darwin-releases.json`
            if (appSettings.beta) {
                feedURL = `${PACKAGE_URL}Mac/darwin-releases-beta.json`
            }
            autoUpdater.setFeedURL({url: feedURL, serverType:'json'});
        }
        autoUpdater.checkForUpdates();
    }
    if (prevSettings.addonUpdateInterval != appSettings.addonUpdateInterval) {
        fileService.setAddonUpdateInterval();
    }    
});