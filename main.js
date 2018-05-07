'use strict'

const electron = require('electron');
const {app, BrowserWindow, ipcMain} = electron;
let mainWindow = null;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 200,
        height: 200
    });
    mainWindow.loadURL(`file://${__dirname}/templates/index.html`);
});

// Listen for async message from renderer process
ipcMain.on('request', (event, arg) => {
    // Print 1
    console.log(arg);
    // Reply on async message from renderer process
    // event.sender.send('response', 2);
});