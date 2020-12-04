import { app, ipcMain } from 'electron';
import { getAppData } from '../../services/storage.service';

ipcMain.on('is-app-update-available', (event) => {
  event.returnValue = getAppData('updatePending');
});

ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion();
});

ipcMain.on('get-app-uuid', (event) => {
  event.returnValue = getAppData('UUID');
});

ipcMain.on('get-new-terms', (event) => {
  const privacy = getAppData('privacy');
  const tos = getAppData('tos');
  const response = {
    privacy: false,
    privacyText: '',
    tos: false,
    tosText: '',
  };
  if (!privacy.accepted) {
    response.privacy = true;
    response.privacyText = privacy.text;
  }
  if (!tos.accepted) {
    response.tos = true;
    response.tosText = tos.text;
  }
  event.returnValue = response;
});
