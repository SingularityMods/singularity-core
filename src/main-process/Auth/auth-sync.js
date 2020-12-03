import { ipcMain } from 'electron';
import { getProfile } from '../../services/auth.service';

ipcMain.on('get-profile', (event) => {
    event.returnValue = getProfile();
});