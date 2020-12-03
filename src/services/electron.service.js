import { BrowserWindow } from 'electron';

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

export default getMainBrowserWindow;
