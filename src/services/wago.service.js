import { app } from 'electron';
import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import luaparse from 'luaparse';
import axios from 'axios';

import log from 'electron-log';

import {
  isAuthenticated,
} from './auth.service';
import {
  getAddonDir,
  getAddonSettingsDir,
  getGameSettings,
  getWagoAPIKey,
  getWagoEnabledVersions,
  updateWagoScriptInfo,
  updateInstalledAddonInfo,
  removeInstalledAddonInfo,
} from './storage.service';
import {
  createAndSaveSyncProfile,
  installAddon,
} from './file.service';
import {
  getMainBrowserWindow,
} from './electron.service';
import {
  getWagoDownloadUrl,
} from './singularity.service';
import getWowAccounts from './wow.service';

function isCompanionInstalled(gameVersion) {
  return new Promise((resolve) => {
    const gameId = 1;
    const addonDir = getAddonDir(gameId, gameVersion);
    const manifestFile = path.join(addonDir, 'WeakAurasCompanion/WeakAurasCompanion.toc');
    return _doesItemExist(manifestFile)
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
}

function uninstallCompanion(gameVersion) {
  return new Promise((resolve, reject) => {
    const gameId = 1;
    const addonDir = getAddonDir(gameId, gameVersion);
    const dir = path.join(addonDir, 'WeakAurasCompanion');
    let gameVersionFlavor;
    switch (gameVersion) {
      case 'wow_retail':
      case 'wow_retail_ptr':
      case 'wow_retail_beta':
        gameVersionFlavor = 'wow_retail';
        break;
      case 'wow_classic':
        gameVersionFlavor = 'wow_classic';
        break;
      case 'wow_classic_ptr':
      case 'wow_classic_beta':
        gameVersionFlavor = 'wow_burning_crusade';
        break;
      default:
        gameVersionFlavor = 'wow_retail';
        break;
    }
    fsPromises.access(dir, fs.constants.F_OK)
      .then(() => fsPromises.rmdir(dir, { recursive: true })
        .then(() => getWagoDownloadUrl(gameVersionFlavor))
        .then((fileInfo) => removeInstalledAddonInfo(gameId, gameVersion, fileInfo.project))
        .then(() => resolve())
        .catch((err) => {
          log.error('Error uninstalling WAGO Updater');
          log.error(err);
          reject(err);
        }))
      .catch(() => {
        log.error("Companion doesn't exist.");
        return resolve();
      });
  });
}

function installCompanion(gameVersion) {
  return new Promise((resolve, reject) => {
    const gameId = 1;
    let gameVersionFlavor;
    switch (gameVersion) {
      case 'wow_retail':
      case 'wow_retail_ptr':
      case 'wow_retail_beta':
        gameVersionFlavor = 'wow_retail';
        break;
      case 'wow_classic':
        gameVersionFlavor = 'wow_classic';
        break;
      case 'wow_classic_ptr':
      case 'wow_classic_beta':
        gameVersionFlavor = 'wow_burning_crusade';
        break;
      default:
        gameVersionFlavor = 'wow_retail';
        break;
    }
    const addonDir = getAddonDir(gameId, gameVersion);
    return getWagoDownloadUrl(gameVersionFlavor)
      .then((fileInfo) => installAddon(addonDir, fileInfo.downloadUrl)
        .then(() => fileInfo)
        .catch((err) => {
          log.error(err.message);
          return Promise.reject(err);
        }))
      .then((fileInfo) => {
        const latestFiles = [];
        latestFiles.push(fileInfo.fileDetails);
        const tmpAddon = {
          addonName: 'WAGO Updater',
          addonId: fileInfo.fileDetails.project,
          trackBranch: 1,
          autoUpdate: false,
          ignoreUpdate: true,
          latestFiles,
          author: 'XORRO',
        };
        return updateInstalledAddonInfo(gameId, gameVersion, tmpAddon, fileInfo.fileDetails);
      })
      .then((installedAddon) => {
        const gameS = getGameSettings(gameId.toString());
        if (gameS[gameVersion].sync && isAuthenticated()) {
          log.info('Game version is configured to sync, updating profile');
          return createAndSaveSyncProfile({ gameId, gameVersion })
            .then(() => {
              log.info('Sync profile updated');
              return resolve(installedAddon);
            })
            .catch((err) => {
              log.error('Error saving sync profile');
              log.error(err);
              return resolve(installedAddon);
            });
        }
        log.info(`Successfully installed ${installedAddon.addonName}`);
        return resolve(installedAddon);
      })
      .catch((error) => {
        log.error(error.message);
        return reject(error);
      });
  });
}

function _updateData(gameVersion, wadata, platerdata) {
  return new Promise((resolve, reject) => {
    const gameId = 1;
    const addonDir = getAddonDir(gameId, gameVersion);
    const filePath = path.join(addonDir, 'WeakAurasCompanion/data.lua');
    let content = '-- file generated automatically\nWeakAurasCompanion = {\n  slugs = {\n';
    if ('slugs' in wadata) {
      wadata.slugs.forEach((slug) => {
        const line = `${slug}    },\n`;
        content += line;
      });
    }
    content += '  },\n  uids = {\n';

    if ('uids' in wadata) {
      wadata.uids.forEach((uid) => {
        content += uid;
      });
    }
    content += '  },\n  ids = {\n';

    if ('ids' in wadata) {
      wadata.ids.forEach((id) => {
        content += id;
      });
    }
    content += '  },\n  stash = {\n  },\n  Plater = {\n    slugs = {\n';

    if ('slugs' in platerdata) {
      platerdata.slugs.forEach((slug) => {
        const line = `  ${slug.replace('      ', '        ')}      },\n`;
        content += line;
      });
    }
    content += '    },\n    uids = {\n    },\n    ids = {\n';

    if ('ids' in platerdata) {
      platerdata.ids.forEach((id) => {
        const line = `  ${id}`;
        content += line;
      });
    }
    content += '    },\n    stash = {\n    }\n  }\n}';

    return fsPromises.writeFile(filePath, content)
      .then(() => resolve())
      .catch((error) => {
        log.error('Error updating weakauras companion');
        log.error(error);
        return reject(new Error('Error updating weakauras companion'));
      });
  });
}

function _checkAPIForUpdates(addon, list) {
  return new Promise((resolve, reject) => {
    const apiKey = getWagoAPIKey() || '';
    const axiosConfig = {
      headers: {
        'User-Agent': `Singularity-${app.getVersion()}`,
        'api-key': apiKey,
      },
    };
    const idList = list.map((o) => o.slug);
    const ids = idList.join(',');
    const requestUrl = `https://data.wago.io/api/check/${addon}?ids=${ids}`;
    return axios.get(requestUrl, axiosConfig)
      .then((res) => {
        if (res.status !== 200) {
          return reject(new Error('Error checking for WAGO updates'));
        }
        return resolve(res.data);
      })
      .catch((error) => {
        log.error(error);
        reject(new Error('Error checking for WAGO updates'));
      });
  });
}

function _checkForUpdates(addon, list, account) {
  return new Promise((resolve, reject) => {
    if (list.length === 0) {
      return resolve([]);
    }
    return _checkAPIForUpdates(addon, list)
      .then((results) => {
        const returnData = [];
        results.forEach((result) => {
          let match = list.find((o) => o.slug === result.slug);
          if (!match) {
            match = list.find((o) => o.slug === result._id);
          }
          if (!match) {
            return;
          }
          result.type = addon;
          result.account = account;
          result.updateAvailable = false;
          result.uid = match.uid;
          result.id = match.id;
          if (result.version > match.version
              && (!match.skip || match.skip !== result.version)
          ) {
            result.updateAvailable = true;
          }
          returnData.push(result);
        });
        return resolve(returnData);
      })
      .catch((error) => reject(error));
  });
}

function _doesItemExist(dir) {
  return new Promise((resolve, reject) => {
    fsPromises.access(dir, fs.constants.F_OK)
      .then(() => {
        resolve(dir);
      })
      .catch(() => reject(new Error('Path does not contain a WAGO config')));
  });
}

function _getPlaterScriptInfo(fields) {
  const items = [];
  fields.forEach((field) => {
    const urlElem = field.value.fields.find((o) => o.key.raw === '"url"');
    if (urlElem) {
      const ignoreUpdate = field.value.fields.find((o) => o.key.raw === '"ignoreWagoUpdate"');
      const skipUpdate = field.value.fields.find((o) => o.key.raw === '"skipWagoUpdate"');
      if (!ignoreUpdate || !ignoreUpdate.value.value) {
        const idElem = field.value.fields.find((o) => o.key.raw === '"Name"');
        const id = idElem.value.raw.replaceAll('"', '');
        let skip;
        if (skipUpdate) {
          skip = skipUpdate.value.raw.replaceAll('"', '');
          if (skip) {
            skip = parseInt(skip, 10);
          }
        }
        const url = urlElem.value.raw.replaceAll('"', '');
        const r = url.match(/\/([a-zA-Z0-9_-]+)\/(\d+)/);
        if (r) {
          items.push({
            type: 'plater',
            id,
            url,
            slug: r[1],
            version: parseInt(r[2], 10),
            skip,
          });
        }
      }
    }
  });
  return items;
}

function _parsePlaterLUA(luaData) {
  let items = [];
  if (luaData && luaData.body && luaData.body.length > 0) {
    const profiles = luaData.body[0].init[0].fields.find((o) => o.key.raw === '"profiles"');
    profiles.value.fields.forEach((profile) => {
      const scriptDataElem = profile.value.fields.find((o) => o.key.raw === '"script_data"');
      const hookDataElem = profile.value.fields.find((o) => o.key.raw === '"hook_data"');
      const urlElem = profile.value.fields.find((o) => o.key.raw === '"url"');
      if (scriptDataElem) {
        const scriptElems = _getPlaterScriptInfo(scriptDataElem.value.fields);
        items = items.concat(scriptElems);
      }
      if (hookDataElem) {
        const hookElems = _getPlaterScriptInfo(hookDataElem.value.fields);
        items = items.concat(hookElems);
      }
      if (urlElem) {
        const ignoreUpdate = profile.value.fields.find((o) => o.key.raw === '"ignoreWagoUpdate"');
        const skipUpdate = profile.value.fields.find((o) => o.key.raw === '"skipWagoUpdate"');
        if (!ignoreUpdate || !ignoreUpdate.value.value) {
          let skip;
          if (skipUpdate) {
            skip = skipUpdate.value.raw.replaceAll('"', '');
            if (skip) {
              skip = parseInt(skip, 10);
            }
          }
          const url = urlElem.value.raw.replaceAll('"', '');
          const r = url.match(/\/([a-zA-Z0-9_-]+)\/(\d+)/);
          if (r) {
            items.push({
              type: 'plater',
              id: r[1],
              url,
              slug: r[1],
              version: parseInt(r[2], 10),
              skip,
            });
          }
        }
      }
    });
  }
  return items;
}

function _parseWALUA(luaData) {
  const items = [];
  if (luaData && luaData.body && luaData.body.length > 0) {
    const displays = luaData.body[0].init[0].fields.find((o) => o.key.raw === '"displays"');
    displays.value.fields.forEach((f) => {
      const urlElem = f.value.fields.find((o) => o.key.raw === '"url"');
      if (urlElem) {
        const parent = f.value.fields.find((o) => o.key.raw === '"parent"');
        const ignoreUpdate = f.value.fields.find((o) => o.key.raw === '"ignoreWagoUpdate"');
        const skipUpdate = f.value.fields.find((o) => o.key.raw === '"skipWagoUpdate"');
        const uidElem = f.value.fields.find((o) => o.key.raw === '"uid"');
        const idElem = f.value.fields.find((o) => o.key.raw === '"id"');
        if (!parent
          && (!ignoreUpdate || !ignoreUpdate.value.value)
          && uidElem
          && idElem
        ) {
          let skip;
          if (skipUpdate) {
            skip = skipUpdate.value.raw.replaceAll('"', '');
            if (skip) {
              skip = parseInt(skip, 10);
            }
          }
          const url = urlElem.value.raw.replaceAll('"', '');
          const uid = uidElem.value.raw.replaceAll('"', '');
          const id = idElem.value.raw.replaceAll('"', '');
          const r = url.match(/\/([a-zA-Z0-9_-]+)\/(\d+)/);
          if (r && r[1] && r[2]) {
            items.push({
              type: 'weakauras',
              uid,
              id,
              url,
              slug: r[1],
              version: parseInt(r[2], 10),
              skip,
            });
          }
        }
      }
    });
  }
  return items;
}

function _parseLUA(addon, dir) {
  return new Promise((resolve, reject) => fsPromises.readFile(dir, { encoding: 'utf-8' })
    .then((fileContents) => {
      let items = [];
      const luaData = luaparse.parse(fileContents);
      if (addon === 'weakauras') {
        items = _parseWALUA(luaData);
      } else if (addon === 'plater') {
        items = _parsePlaterLUA(luaData);
      }
      return resolve(items);
    })
    .catch((error) => {
      log.error(`Error reading lua file ${dir}`);
      log.error(error);
      return reject(new Error('Error reading addon settings file'));
    }));
}

function _getEncodedScript(id) {
  return new Promise((resolve, reject) => {
    const apiKey = getWagoAPIKey() || '';
    const axiosConfig = {
      headers: {
        'User-Agent': `Singularity-${app.getVersion()}`,
        'api-key': apiKey,
      },
    };
    const requestUrl = `https://data.wago.io/api/raw/encoded?id=${id}`;
    return axios.get(requestUrl, axiosConfig)
      .then((res) => {
        if (res.status !== 200) {
          return reject(new Error('Error downloading updated WAGO item'));
        }
        return resolve(res.data);
      })
      .catch((error) => {
        log.error(error);
        reject(new Error('Error downloading updated WAGO item'));
      });
  });
}

function _buildUpdate(script, addonuids, addonids) {
  return new Promise((resolve, reject) => _getEncodedScript(script.slug)
    .then((encodedData) => {
      let entry = '';
      let uids = '';
      let ids = '';
      entry += `    ["${script.slug}"] = {{\n      name = [=[${script.name}]=],\n      author = [=[`;
      entry += `${script.username}]=],\n      encoded = [=[${encodedData}]=],\n      wagoVersion = [=[`;
      entry += `${script.version}]=],\n      wagoSemver = [=[${script.versionString}]=],\n      `;
      entry += `versionNote = [=[${script.changelog.text}}]=],\n`;
      addonuids.forEach((uid) => {
        if (uid === script.slug) {
          const cleanString = uid.replace('"', '\\"');
          uids += `    ["${cleanString}"] = [=[${entry.slug}]=],\n`;
        }
      });
      addonids.forEach((id) => {
        if (id === script.slug) {
          const cleanString = id.replace('"', '\\"');
          ids += `    ["${cleanString}"] = [=[${entry.slug}]=],\n`;
        }
      });
      return resolve({
        entry,
        uids,
        ids,
      });
    })
    .catch((error) => reject(error)));
}

function _handleUpdateResults(addon, scriptList) {
  return new Promise((resolve, reject) => {
    const promises = [];
    const uids = [];
    const ids = [];
    if (scriptList.length === 0) {
      return resolve({
        type: addon,
        scriptList,
        slugData: [],
        uidData: [],
        idData: [],
      });
    }
    scriptList.forEach((script) => {
      uids.push(script.uid);
      ids.push(script.id);
    });
    scriptList.forEach((script) => {
      if (script.updateAvailable) {
        promises.push(_buildUpdate(script, uids, ids));
      }
    });
    return Promise.allSettled(promises)
      .then((results) => {
        const slugData = [];
        const uidData = [];
        const idData = [];
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            slugData.push(result.value.entry);
            uidData.push(result.value.uids);
            idData.push(result.value.ids);
          }
        });
        return resolve({
          type: addon,
          scriptList,
          slugData,
          uidData,
          idData,
        });
      })
      .catch((error) => reject(error));
  });
}

function _handleWagoItem(addon, settingsDir, account) {
  return new Promise((resolve, reject) => {
    let dir;
    if (addon === 'weakauras') {
      dir = path.join(settingsDir, 'Account', account, '/SavedVariables/WeakAuras.lua');
    } else if (addon === 'plater') {
      dir = path.join(settingsDir, 'Account', account, '/SavedVariables/Plater.lua');
    }
    return _doesItemExist(dir)
      .then(() => _parseLUA(addon, dir))
      .then((items) => _checkForUpdates(addon, items, account))
      .then((scriptList) => _handleUpdateResults(addon, scriptList))
      .then((addonData) => resolve(addonData))
      .catch((error) => reject(error));
  });
}

function _installUpdates(gameVersion, updateInfo, addonInfo) {
  return new Promise((resolve, reject) => _updateData(
    gameVersion, updateInfo.weakauras, updateInfo.plater,
  )
    .then(() => {
      const newWagoSettings = updateWagoScriptInfo(
        gameVersion, addonInfo.weakauras, addonInfo.plater,
      );
      return resolve(newWagoSettings);
    })
    .catch((error) => reject(error)));
}

function checkGameVersionForWagoUpdates(gameVersion) {
  log.info(`Checking for WAGO updates for ${gameVersion}`);
  return new Promise((resolve, reject) => {
    const gameId = 1;
    const settingsDir = getAddonSettingsDir(gameId, gameVersion);
    return isCompanionInstalled(gameVersion)
      .then((installed) => {
        if (!installed) {
          log.info(`WAGO companion not installed for ${gameVersion}, installing now`);
          return installCompanion(gameVersion);
        }
        return true;
      })
      .then(() => getWowAccounts(gameVersion))
      .then((accounts) => {
        const promises = [];
        accounts.forEach((account) => {
          promises.push(_handleWagoItem('plater', settingsDir, account));
          promises.push(_handleWagoItem('weakauras', settingsDir, account));
        });
        return Promise.allSettled(promises);
      })
      .then((results) => {
        const updateInfo = {
          weakauras: {},
          plater: {},
        };
        const addonInfo = {
          weakautas: [],
          plater: [],
        };
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            updateInfo[result.value.type] = {
              slugs: result.value.slugData,
              uids: result.value.uidData,
              ids: result.value.idData,
            };
            addonInfo[result.value.type] = result.value.scriptList;
          } else if (result.reason.message !== 'Path does not contain a WAGO config') {
            log.error(result.reason.message);
          }
          log.info(`Finished checking for WAGO updates for ${gameVersion}`);
        });
        return _installUpdates(gameVersion, updateInfo, addonInfo)
          .then((newWagoSettings) => resolve(newWagoSettings))
          .catch((error) => reject(error));
      })
      .catch(() => reject(new Error('No accounts detected for game version')));
  });
}

function checkForWagoUpdates(enabledVersions) {
  return new Promise((resolve) => {
    const versions = enabledVersions || getWagoEnabledVersions();
    if (versions.length === 0) {
      return resolve();
    }
    log.info('Wago update enabled for at least one game version, checking for updates');
    const promises = [];
    versions.forEach((v) => {
      promises.push(checkGameVersionForWagoUpdates(v));
    });
    return Promise.allSettled(promises)
      .then((results) => {
        results.forEach((result) => {
          if (result.status === 'rejected') {
            log.error(result.reason.message);
          }
        });
        return resolve();
      })
      .catch((error) => {
        log.error('Error while checking for Wago updates');
        log.error(error);
      });
  });
}

setInterval(() => {
  const enabledVersions = getWagoEnabledVersions();
  if (enabledVersions.length > 0) {
    log.info('Starting Wago update check');
    const win = getMainBrowserWindow();
    if (win) {
      win.webContents.send('app-status-message', 'Checking for Wago updates', 'status');
    }
    checkForWagoUpdates(enabledVersions)
      .then(() => {
        log.info('Finished Wago update check');
        if (win) {
          win.webContents.send('app-status-message', 'Finished checking for Wago updates', 'success');
        }
      })
      .catch((error) => {
        log.error('Error while checking for Wago updates');
        log.error(error);
        if (win) {
          win.webContents.send('app-status-message', 'Error encountered while checking for Wago updates', 'error');
        }
      });
  }
}, 1000 * 60 * 15);

export {
  installCompanion,
  uninstallCompanion,
  checkForWagoUpdates,
  checkGameVersionForWagoUpdates,
};
