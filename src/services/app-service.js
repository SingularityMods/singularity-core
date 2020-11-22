const axios = require("axios");
const os = require("os");
const { v4: uuidv4 } = require('uuid');

const storageService = require('../services/storage-service');
const {app} = require('electron');

const log = require('electron-log');

let apiEndpoint = "https://api.singularitymods.com/api/v1/";

function setAPIEndpoint(endpoint) {
    apiEndpoint = endpoint;
}

function getLatestTerms()  {
    log.info('Checking for latest ToS');
    return new Promise((resolve, reject) => {
        let axiosConfig = {
            headers: {
                'User-Agent': 'Singularity-'+app.getVersion(),
                'x-app-uuid': storageService.getAppData('UUID')
            }
        };
        axios.get(`${apiEndpoint}app/latest/tos`, axiosConfig)
        .then(response => {
            if (response.status === 200) {
                let tos = response.data;
                let currentTos = storageService.getAppData('tos');
                if (tos.version > currentTos.version) {
                    currentTos.version = tos.version;
                    currentTos.accepted = false;
                    currentTos.text = tos.text;
                    storageService.setAppData('tos',currentTos);
                    log.info('New ToS found');
                    resolve(true);
                } else {
                    log.info('No new ToS found');
                    resolve(false);
                }
              }
              else {
                return resolve(false);
              }
        })
        .catch( err => {
            log.error('Error checking for latest ToS');
            log.error(err.message);
            return resolve(false);
        })
    });
}

// Download the latest Privacy Policy from the API
function getLatestPrivacy() {
    log.info('Checking for latest Privacy Policy');
    return new Promise((resolve, reject) => {
        let axiosConfig = {
            headers: {
                'User-Agent': 'Singularity-'+app.getVersion(),
                'x-app-uuid': storageService.getAppData('UUID')
            }
        };
        axios.get(`${apiEndpoint}app/latest/privacy`, axiosConfig)
        .then(response => {
            if (response.status === 200) {
                let privacy = response.data;
                let currentPrivacy = storageService.getAppData('privacy');
                if (privacy.version > currentPrivacy.version) {
                    currentPrivacy.version = privacy.version;
                    currentPrivacy.accepted = false;
                    currentPrivacy.text = privacy.text;
                    storageService.setAppData('privacy', currentPrivacy);
                    log.info('New Privacy Policy found');
                resolve(true);
                } else {
                    log.info('No new Privacy Policy found');
                    resolve(false);
                }
              }
              else {
                return resolve(false);
              }
        })
        .catch( err => {
            log.error('Error checking for latest Privacy Policy');
            log.error(err.message);
            return resolve(false);
        })
    });
}

function setAppConfig() {
    let version = storageService.getAppData('version');

    if (version < '0.3.0') {
        let gameD = storageService.getGameData('1');
        gameD.gameVersions.wow_retail.settingsBackup = '';
        gameD.gameVersions.wow_retail.addonBackup = '';
        gameD.gameVersions.wow_classic.settingsBackup = '';
        gameD.gameVersions.wow_classic.addonBackup = '';
        gameD.gameVersions.wow_retail_ptr.settingsBackup = '';
        gameD.gameVersions.wow_retail_ptr.addonBackup = '';
        gameD.gameVersions.wow_classic_ptr.settingsBackup = '';
        gameD.gameVersions.wow_classic_ptr.addonBackup = '';
        storageService.setGameData('1', gameD);
    }
    if (version < '0.3.2') {
        let gameS = storageService.getGameSettings('1');
        gameS.wow_retail_beta = {
            "name": "World of Warcraft Beta",
            "nickName": "Beta",
            "shortName": "wow-retail-beta",
            "installed": false,
            "installPath": "C:\\Program Files (x86)\\World of Warcraft\\_beta_\\",
            "installedAddons": [],
            "unknownAddonDirs": []
        }
        storageService.setGameSettings('1', gameS);
        let gameD = storageService.getGameData('1');
        gameD.gameVersions.wow_retail_beta = {
            "name": "World of Warcraft Beta",
            "nickName": "Beta",
            "shortName": "wow-retail-beta",
            "addonVersion": "wow_retail",
            "flavorString": "wow_beta",
            "defaultWinInstallPath": "C:\\Program Files (x86)\\World of Warcraft\\_beta_\\",
            "defaultMacInstallPath": "/Applications/World of Warcraft/_beta_/",
            "executable": "WowB.exe",
            "macExecutable": "World of Warcraft Beta.app",
            "addonDir": "Interface\\Addons\\",
            "macAddonDir": "Interface/Addons/",
            "settingsBackup": "",
            "addonBackup": ""
        }
        storageService.setGameData('1',gameD);
    }
    if (version < '0.4.0') {
        let wowData = storageService.getGameData('1');
        if (!('macFlavorString' in wowData.gameVersions.wow_retail)) {
            wowData.gameVersions.wow_retail.macFlavorString = "/_retail_";
            wowData.gameVersions.wow_retail.macAddonDir = "Interface/Addons/";
            wowData.gameVersions.wow_classic.macFlavorString = "/_classic_";
            wowData.gameVersions.wow_classic.macAddonDir = "Interface/Addons/";
            wowData.gameVersions.wow_retail_ptr.macFlavorString = "/_ptr_";
            wowData.gameVersions.wow_retail_ptr.macAddonDir = "Interface/Addons/";
            wowData.gameVersions.wow_classic_ptr.macFlavorString = "/_classic_ptr_";
            wowData.gameVersions.wow_classic_ptr.macAddonDir = "Interface/Addons/";
            wowData.gameVersions.wow_retail_beta.macFlavorString = "/_beta_";
            wowData.gameVersions.wow_retail_beta.macAddonDir = "Interface/Addons/";
            storageService.setGameData('1',wowData);
        }
    }
    if (version < '0.5.0') {   
        let gameS = storageService.getGameSettings('1');  
        for (const [key, value] of Object.entries(gameS)) {
            var gameVersion = key;
            var fixedAddons = [];
            let installedAddons = gameS[gameVersion].installedAddons;
            installedAddons.forEach((addon) => {
                addon.trackBranch = addon.trackBranch || 1;
                addon.autoUpdate = addon.autoUpdate || false;
                addon.ignoreUpdate = addon.ignoreUpdate || false;
                addon.unknownUpdate = addon.unknownUpdate || false;
                addon.brokenInstallation = addon.brokenInstallation || false;
                fixedAddons.push(addon);
            })
            gameS[gameVersion].installedAddons = fixedAddons;
            storageService.setGameSettings('1',gameS);
        }
    } 
    if (version < '0.6.0') {
        let gameS = storageService.getGameSettings('1');
        if (!("wow_retail_beta" in gameS)) {
            gameS.wow_retail_beta = {
                "name": "World of Warcraft Beta",
                "nickName": "Beta",
                "shortName": "wow-retail-beta",
                "installed": false,
                "installPath": "C:\\Program Files (x86)\\World of Warcraft\\_beta_\\",
                "installedAddons": [],
                "unknownAddonDirs": []
            }
        }
        storageService.setGameSettings('1', gameS);
        let wowData = storageService.getGameData('1');
        if (!("wow_retaul_beta" in wowData.gameVersions)) {
            wowData.gameVersions.wow_retail_beta = {
                "name": "World of Warcraft Beta",
                "nickName": "Beta",
                "shortName": "wow-retail-beta",
                "addonVersion": "wow_retail",
                "flavorString": "wow_beta",
                "defaultWinInstallPath": "C:\\Program Files (x86)\\World of Warcraft\\_beta_\\",
                "defaultMacInstallPath": "/Applications/World of Warcraft/_beta_/",
                "executable": "WowB.exe",
                "macExecutable": "World of Warcraft Beta.app",
                "addonDir": "Interface\\Addons\\",
                "macAddonDir": "Interface/Addons/",
                "settingsBackup": "",
                "addonBackup": ""
            }
        } else if (!("macAddonDir" in wowData.gameVersions.wow_retail_beta)) {
            wowData.gameVersions.wow_retail_beta.macAddonDir = "Interface/Addons/"
        }
        storageService.setGameData('1', wowData);
        let userConf = storageService.getAppData('userConfigurable');
        if (!("defaultWowVersion" in userConf)) {
            userConf.defaultWowVersion = "wow_retail"
        }
        storageService.setAppData('userConfigurable', userConf)
    }

    if (version < '1.0.0') {   
        storageService.setAppData('sidebarMinimized', false);
    } 

    if (version < app.getVersion()) {
        let gameS = storageService.getGameSettings('1');  
        for (const [key, value] of Object.entries(gameS)) {
            var gameVersion = key;
            gameS[gameVersion].sync = false;
            storageService.setGameSettings('1',gameS);
        }
    }

    // Set new version
    storageService.setAppData('version', app.getVersion());

    // Set UUID if it doesn't exist
    if (storageService.getAppData('UUID') == "") {
        storageService.setAppData('UUID', uuidv4());
    }
}

module.exports = {
  setAPIEndpoint,
  getLatestTerms,
  getLatestPrivacy,
  setAppConfig
};