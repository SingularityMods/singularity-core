const { ipcMain, shell, app } = require('electron');
const path = require('path');

const log = require('electron-log');

ipcMain.on('open-log-directory', (event) => {
    log.info("Opening log directory");
    let userDataPath = app.getPath('userData');
    let logDir = path.join(userDataPath, 'logs');
    console.log(logDir);

    shell.openPath(logDir);
});