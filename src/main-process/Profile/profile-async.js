const {app, ipcMain} = require('electron');
const storageService = require('../../services/storage-service');
const authService = require('../../services/auth-service');
const axios = require('axios');

const log = require('electron-log');

ipcMain.on('resend-email-auth', async (event) => {
    var postData = {};
    let axiosConfig = {
        headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Singularity-'+app.getVersion(),
        'x-auth': authService.getAccessToken()}
    };
    axios.post(`https://id.singularitymods.com/resendemail`,postData, axiosConfig)
    .then(res => {
        if (res.status === 200) {
            event.sender.send('email-resent', true);          
        } else {
            event.sender.send('email-resent', false); 
        }
    })
    .catch((err) => {
        event.sender.send('email-resent', false); 
    })
});