const {app, ipcMain} = require('electron');
const storageService = require('../../services/storage-service');
const authService = require('../../services/auth-service');
const axios = require('axios');

const log = require('electron-log');

ipcMain.on('check-username', async (event, username) => {
    var postData = {
        username: username
    };
    let axiosConfig = {
        headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Singularity-'+app.getVersion()}
    };
    axios.post(`https://id.singularitymods.com/checkusername`,postData, axiosConfig)
    .then(res => {
        if (res.status === 200) {
            if (res.data.available) {
                event.sender.send('username-check', username, true);
            } else {
                event.sender.send('username-check', username, false);
            }              
        } else {
            event.sender.send('username-check', username, false);
        }
    })
    .catch((err) => {
        event.sender.send('username-check', username, false);
    })

})

ipcMain.on('signup-auth', async (event, username, email, password) => {
    var postData = {
        username: username,
        email: email,
        password: password,
        uuid: storageService.getAppData('UUID'),
        platform: process.platform
    };
    let axiosConfig = {
        headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Singularity-'+app.getVersion()}
    };
    axios.post(`https://id.singularitymods.com/register`,postData, axiosConfig)
    .then(res => {
        if (res.status === 200) {
            if (res.data.auth) {
                authService.setTokens(res.data)
                .then(() => {
                    log.info('User authenticated');
                    event.sender.send('auth-event', 'signup', true, null);
                })
                .catch(err => {
                    event.sender.send('auth-event', 'signup', false,'Site error, contact support!');
                }) 
            } else {
                event.sender.send('auth-event','signup', false,res.data.message);
            }              
        } else {
            event.sender.send('auth-event','signup', false,'Site error, contact support!');
        }
    })
    .catch((err) => {
        event.sender.send('auth-event','signup', false,'Site error, contact support!');
    })
});
