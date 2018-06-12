'use strict';

const electron = require('electron');
const path = require('path');
const {app, BrowserWindow, ipcMain} = electron;
const isDev = require('electron-is-dev');

const ph = require('./modules/path-handling.js');
const UserData = require('./modules/user-data');
const {handleLocalRequest, handleRemoteRequest, killStream} = require('./modules/request-handling');

const NUM_OF_ARGS = isDev ? 3 : 2;  // in dev mode, electron offsets argument by 1

// disable logging in production
if (!isDev) {
    console.log = function () {
    };
}

let mainWindow = null;
let optionsWindow = null;
let userData = null;
let activeStream = null;

function parseCommandLineArgs(event) {
    if (process.argv.length < NUM_OF_ARGS - 1 || process.argv.length > NUM_OF_ARGS) {
        console.error('Wrong arguments!');
        mainWindow.close();
    } else {
        event.sender.send('updateUserData', userData.data());

        if (process.argv.length === NUM_OF_ARGS) {
            let replyMsg = ph.pathToJson(process.argv[NUM_OF_ARGS - 1]);
            replyMsg["isLocal"] = true;
            replyMsg["alias"] = "";

            event.sender.send('response', replyMsg);
        }
    }
}

function openOptionsWindow(event) {
    optionsWindow = new BrowserWindow({
        icon: path.join(__dirname, 'icons/folder128.png'),
        width: 1000,
        height: 700,
        minWidth: 600,
        minHeight: 400,
        parent: mainWindow,
        modal: true
    });

    optionsWindow.loadURL(`file://${__dirname}/renderer/config/index.html`);

    optionsWindow.on('closed', () => {
        event.sender.send('updateUserData', userData.data());
        optionsWindow = null;
    });
}

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        icon: path.join(__dirname, 'icons/folder128.png'),
        width: 1200,
        height: 800,
        minWidth: 600,
        minHeight: 400
    });
    mainWindow.loadURL(`file://${__dirname}/renderer/main/index.html`);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    userData = new UserData('./.userData');

    ipcMain.on('ready', (event) => {
        parseCommandLineArgs(event);
    });

    ipcMain.on('localRequest', (event, msg) => {
        killStream(activeStream);
        activeStream = handleLocalRequest(event, msg);
    });

    ipcMain.on('remoteRequest', (event, msg) => {
        killStream(activeStream);
        activeStream = handleRemoteRequest(event, msg, userData);
    });

    ipcMain.on('newWindowRequest', (event, arg) => {
        openOptionsWindow(event);
    });

    ipcMain.on('addDisc', (event, aMsg) => {
        event.sender.send('actionResult', userData.createLocation(aMsg.type, aMsg.locationData));
        event.sender.send('userConfig', userData.data());
    });

    ipcMain.on('updateDisc', (event, aMsg) => {
        event.sender.send('actionResult', userData.updateLocation(aMsg.locationData, aMsg.oldAlias));
        event.sender.send('userConfig', userData.data());
    });

    ipcMain.on('deleteDisc', (event, aMsg) => {
        event.sender.send('actionResult', userData.removeLocation(aMsg));
        event.sender.send('userConfig', userData.data());
    });

    ipcMain.on('userConfig', (event, arg) => {
        event.sender.send('userConfig', userData.data());
    });
});

app.on('window-all-closed', () => {
    userData.dumpToFile();
    app.quit();
});
