'use strict';

const electron = require('electron');
const path = require('path');
const {app, BrowserWindow, ipcMain} = electron;
const isDev = require('electron-is-dev');

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

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        icon: path.join(__dirname, 'src/icons/folder128.ico'),
        width: 1200,
        height: 800
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
            event.sender.send('leftPanel', userData.data());

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
        // TODO: Handle locTypeAndIndex being undefined !!!
        const locData = userData.getLocByTypeAndIndex(locTypeAndIndex);

        const postData = querystring.stringify({
            l: locData.login,
            p: locData.pass,
            q: rMsg.path
        });  // TODO: Make sure this is a query string, send as both qstring and POST body (json) to be sure its compliant with API

        let responseFull = [];

        http.request({
            url: locData.url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            content: JSON.stringify(postData)
        }).then(res => {
            res.on('data', (chunk) => {
                console.log(`BODY: ${chunk}`); // TODO: Extract valid json chunk
                responseFull = responseFull.concat(chunk);
            });
            res.on('end', () => {
                console.log('No more data in response.');
                // TODO: handle end event
            });
        }, err => {
            console.log("Error: " + (err.message || err));
            // TODO: Pass to renderer
        });


        event.sender.send('response', parseRemoteJsonChunk(responseFull, true));
        // TODO: Send chunks directly to renderer
        // TODO: In reply add isLocal and alias
    });

    ipcMain.on('newWindowRequest', (event, arg) => {
        optionsWindow = new BrowserWindow({
            icon: path.join(__dirname, 'src/icons/folder128.ico'),
            width: 1200,
            height: 800
        });

        optionsWindow.loadURL(`file://${__dirname}/templates/config.html`);

        optionsWindow.on('closed', () => {
            event.sender.send('updateUserData', userData.data());
            mainWindow = null;
        });
    });

    ipcMain.on('addDisc', (event, aMsg) => {
        event.sender.send('actionResult', userData.createLocation(aMsg.type, aMsg.locationData));
    });

    ipcMain.on('updateDisc', (event, aMsg) => {
        event.sender.send('actionResult', userData.updateUserData(aMsg.locationData, aMsg.oldAlias));
    });

    ipcMain.on('deleteDisc', (event, aMsg) => {
        event.sender.send('actionResult', userData.removeLocation(aMsg));
    });

    ipcMain.on('userConfig', (event, arg) => {
        event.sender.send('userConfig', userData.data());
    });
});

app.on('window-all-closed', () => {
    app.quit();
});

function parseRemoteJsonChunk(arr, isNew = false) {
    // TODO error handling, fast fix
    if (!arr || !arr[0] || !(arr[0].e)) {
        return null;
    }

    if (arr[0].e) {
        return {
            valid: false,
            error: arr[0].e
        }
    }

    let files = arr.filter(item => (item.k === 'f')).map(f => ({
        name: f.n,
        type: 'file'
    }));

    let dirs = arr.filter(item => (item.k === 'd')).map(d => ({
        name: f.n,
        type: 'directory'
    }));

    return {
        isNew,
        parsedFiles: dirs.concat(files),
        valid: true
    }
}
