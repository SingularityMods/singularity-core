const {app, ipcMain} = require('electron');
const storageService = require('../../services/storage-service');
const authService = require('../../services/auth-service');
const axios = require('axios');
const os = require('os');

const log = require('electron-log');

ipcMain.on('login-auth', async (event, email, password) => {
    var postData = {
        email: email,
        password: password,
        uuid: storageService.getAppData('UUID'),
        platform: process.platform,
        hostname: os.hostname()
    };
    let axiosConfig = {
        headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Singularity-'+app.getVersion()}
    };
    axios.post(`https://id.singularitymods.com/login`,postData, axiosConfig)
    .then(res => {
        if (res.status === 200) {
            if (res.data.auth) {
                log.info('Received succesful auth response');
                authService.setTokens(res.data)
                .then(() => {
                    log.info('User authenticated');
                    event.sender.send('auth-event','login', true, null);
                })
                .catch(err => {
                    event.sender.send('auth-event','login', false,'Site error, contact support!');
                }) 
            } else {
                event.sender.send('auth-event','login',false,res.data.message);
            }              
        } else {
            event.sender.send('auth-event','login',false,'Site error, contact support!');
        }
    })
    .catch((err) => {
        event.sender.send('auth-event','login',false,'Site error, contact support!');
    })
});