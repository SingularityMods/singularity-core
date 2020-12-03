import {ipcMain} from 'electron';

import { isSearchingForProfiles } from '../../services/file.service';
import { getGameSettings } from '../../services/storage.service';

ipcMain.on('is-sync-enabled', (event, gameId, gameVersion) => {
  let gameS = getGameSettings(gameId.toString());
  event.returnValue = gameS[gameVersion].sync;
})

ipcMain.on('is-sync-profile-updating', (event) => {
  event.returnValue = isSearchingForProfiles();
})