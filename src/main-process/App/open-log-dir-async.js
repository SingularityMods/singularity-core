const { ipcMain, shell, app } = require('electron');
const os = require('os');
const path = require('path');

const log = require('electron-log');

ipcMain.on('open-log-directory', (event) => {
    log.info("Opening log directory");
    let logDir;

    if (process.platform === 'darwin') {
        logDir = path.join(os.homedir ? os.homedir() : process.env.HOME, 'Library/Logs', app.getName());
    } else {
        logDir = path.join(app.getPath('appData'), app.getName(), 'logs');
    }

    shell.openPath(logDir);
});