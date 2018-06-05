'use strict';

const electron = require('electron');
const path = require('path');
const {app, BrowserWindow, ipcMain} = electron;
const isDev = require('electron-is-dev');

const http = require('http');
const querystring = require('querystring');
const oboe = require('oboe');

const ph = require('./path-handling.js');
const UserData = require('./user-data');

const NUM_OF_ARGS = isDev ? 3 : 2;  // in dev mode, electron offsets argument by 1

// disable logging in production
if (!isDev) {
    console.log = function () {
    };
}

let mainWindow = null;
let optionsWindow = null;
let userData = null;
let current_session_id;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        icon: path.join(__dirname, 'icons/folder128.png'),
        width: 1200,
        height: 800,
        minWidth: 600,
        minHeight: 400
    });

    mainWindow.loadURL(`file://${__dirname}/templates/index.html`);

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
            console.log(userData.data());

            if (process.argv.length === NUM_OF_ARGS) {
                let replyMsg = ph.pathToJson(process.argv[NUM_OF_ARGS - 1]);
                replyMsg["isLocal"] = true;
                replyMsg["alias"] = "";

                event.sender.send('response', replyMsg);
            }
        }
    });

    ipcMain.on('localRequest', (event, pathArg) => {
        let replyMsg = ph.pathToJson(pathArg);
        replyMsg["isLocal"] = true;
        replyMsg["alias"] = "";
        event.sender.send('response', replyMsg);
    });



    ipcMain.on('remoteRequest', (event, rMsg) => {
        const locTypeAndIndex = userData.findLoc(rMsg.alias);
        current_session_id = rMsg.id;

        console.log(rMsg);

        if (locTypeAndIndex === null) {
            sendError(event);
        } else {
            const locData = userData.getLocByTypeAndIndex(locTypeAndIndex);

            let arr = [];

            oboe({
                method: 'POST',
                url: locData.url + `?l=${locData.login}&p=${locData.pass}&q=${locData.path}`,
                agent: false,
                headers: {
                    'User-Agent': 'something',
                },
                json: locData
            }).node('!.*', (data) => {
                console.log(data);
                arr.push(data);

                if (arr.length === 10) {
                    let parsedObjects = parseRemoteJsonChunk(arr, rMsg);

                    if (parsedObjects === null) {
                        sendError(event);
                    } else {
                        console.log(parsedObjects);
                        console.log(rMsg);
                        addExtraAndSend(current_session_id, event, parseRemoteJsonChunk(arr, rMsg));
                    }
                }
            }).fail((error) => {
                console.log(error);
                sendError(event);
            }).done(() => {
                if (arr.length !== 0) {
                    console.log(rMsg);
                    addExtraAndSend(current_session_id, event, parseRemoteJsonChunk(arr, rMsg));
                }
            });
        }
    });

    ipcMain.on('newWindowRequest', (event, arg) => {
        optionsWindow = new BrowserWindow({
            icon: path.join(__dirname, 'icons/folder128.png'),
            width: 1200,
            height: 800,
            minWidth: 600,
            minHeight: 400,
            parent: mainWindow,
            modal: true
        });

        optionsWindow.loadURL(`file://${__dirname}/templates/config.html`);

        optionsWindow.on('closed', () => {
            event.sender.send('updateUserData', userData.data());
            optionsWindow = null;
        });
    });

    ipcMain.on('addDisc', (event, aMsg) => {
        event.sender.send('actionResult', userData.createLocation(aMsg.type, aMsg.locationData));
    });

    ipcMain.on('updateDisc', (event, aMsg) => {
        event.sender.send('actionResult', userData.updateLocation(aMsg.locationData, aMsg.oldAlias));
    });

    ipcMain.on('deleteDisc', (event, aMsg) => {
        event.sender.send('actionResult', userData.removeLocation(aMsg));
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
    validJsonReply.alias = "";
    validJsonReply.id = sessionId;

    event.sender.send('response', validJsonReply);
}

function parseRemoteJsonChunk(arr, rMsg) {
    if (!arr || !arr[0]) {
        return null;
    }

    if (arr[0].e) {
        return {
            valid: false,
            error: arr[0].e
        }
    }

    let files = arr.filter(item => (item.k === 'f')).map(f => f.n);
    let dirs = arr.filter(item => (item.k === 'd')).map(d => d.n);

    return {
        isLocal: false,
        alias: rMsg.alias,
        dividedPath: ph.dividePath(rMsg.path),
        parentPaths: ph.extractParents(rMsg.path),
        path: rMsg.path,
        filesNames: files,
        dirsNames: dirs,
        valid: true
    }
}
