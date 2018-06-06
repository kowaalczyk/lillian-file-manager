'use strict';

const electron = require('electron');
const path = require('path');
const {app, BrowserWindow, ipcMain} = electron;
const isDev = require('electron-is-dev');

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
let activeStream = null;

function killStream(stream) {
    if (stream !== null) {
        stream.abort();
        stream = null;
    }
}

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

            if (process.argv.length === NUM_OF_ARGS) {
                let replyMsg = ph.pathToJson(process.argv[NUM_OF_ARGS - 1]);
                replyMsg["isLocal"] = true;
                replyMsg["alias"] = "";

                event.sender.send('response', replyMsg);
            }
        }
    });

    ipcMain.on('localRequest', (event, pathArg) => {
        killStream(activeStream);
        let replyMsg = ph.pathToJson(pathArg);
        replyMsg["isLocal"] = true;
        replyMsg["alias"] = "";
        event.sender.send('response', replyMsg);
    });



    ipcMain.on('remoteRequest', (event, rMsg) => {
        killStream(activeStream);
        const locTypeAndIndex = userData.findLoc(rMsg.alias);
        const current_session_id = rMsg.id;

        if (locTypeAndIndex === null) {
            console.log("[DEBUG] localTypeAndIndex -> doesn't exist:");
            sendError(event);
        } else {
            const locData = userData.getLocByTypeAndIndex(locTypeAndIndex);

            let arr = [];

            // Bug fix: left panel
            if (rMsg.path !== '/' && rMsg.path.slice(-1) === '/') {
                rMsg.path = rMsg.path.slice(0, -1);
            }

            console.log(locData.url + `?l=${locData.login}&p=${locData.pass}&q=${rMsg.path}`);
            activeStream = oboe({
                method: 'POST',
                url: locData.url + `?l=${locData.login}&p=${locData.pass}&q=${rMsg.path}`,
                agent: false,
                headers: {
                    'User-Agent': 'something',
                },
                json: locData
            }).start((status, headers) => {
                console.log("[DEBUG] On start:");
                console.log(status, headers);
            }).node('!.*', (data) => {
                arr.push(data);

                if (arr.length === 10) {
                    const array_copy = arr.slice();
                    arr.length = 0;
                    const parsedObjects = parseRemoteJsonChunk(array_copy, rMsg);
                    addExtraAndSend(current_session_id, event, parsedObjects);
                }
            }).fail((error) => {
                console.log('[DEBUG] Oboe fail:');
                console.log(error);
                // At first every request to local server gets an error.
                // It's connection error: ECONNRESET
                // https://stackoverflow.com/questions/17245881/node-js-econnreset
                if (error.jsonBody) {
                    const parsedObjects = parseRemoteJsonChunk(error.jsonBody, rMsg);
                    addExtraAndSend(current_session_id, event, parsedObjects);
                } else {
                    sendError(event);
                }

            }).done((response) => {
                console.log(response);
                if (arr.length !== 0) {
                    addExtraAndSend(current_session_id, event, parseRemoteJsonChunk(arr, rMsg));
                }

                event.sender.send('endOfStream');
            });
        }
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

        optionsWindow.loadURL(`file://${__dirname}/templates/config.html`);

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
