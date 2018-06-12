'use strict';

const electron = require('electron');
const path = require('path');
const {app, BrowserWindow, ipcMain} = electron;
const isDev = require('electron-is-dev');

const oboe = require('oboe');

const ph = require('./modules/path-handling.js');
const UserData = require('./modules/user-data');
const {handleLocalRequest, handleRemoteRequest} = require('./modules/request-handling');

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

    // Parse command line arguments
    ipcMain.on('ready', (event) => {
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
    });

    ipcMain.on('localRequest', (event, msg) => {
        handleLocalRequest(event, msg, activeStream);
    });

    ipcMain.on('remoteRequest', (event, msg) => {
        handleRemoteRequest(event, msg, activeStream);
    });

    ipcMain.on('newWindowRequest', (event, arg) => {
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

function sendError(event) {
    const errorResponse = {
        valid: false
    };
    event.sender.send('response', errorResponse);
}

function addExtraAndSend(sessionId, event, validJsonReply) {
    validJsonReply.isLocal = false;
    validJsonReply.id = sessionId;

    event.sender.send('response', validJsonReply);
}

function parseRemoteJsonChunk(arr, rMsg) {
    if (!arr || !arr[0]) {
        return null;
    }

    if (arr[0].m) {
        return {
            valid: false,
            message: arr[0].m
        }
    }

    let files = arr.filter(item => (item.k === 'f')).map(f => f.n);
    let dirs = arr.filter(item => (item.k === 'd')).map(d => d.n);
    let {dividedPath, parentPaths} = ph.extractPathDirs(rMsg.path, true);

    const parsedJsonChunk = {
        isLocal: false,
        alias: rMsg.alias,
        dividedPath: dividedPath,
        parentPaths: parentPaths,
        path: ph.normalizeRemotePath(rMsg.path),
        filesNames: files,
        dirsNames: dirs,
        valid: true
    };

    return parsedJsonChunk;
}
