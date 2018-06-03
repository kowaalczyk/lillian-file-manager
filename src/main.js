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
                event.sender.send('response', ph.pathToJson(process.argv[NUM_OF_ARGS - 1]));
            }
        }
    });

    ipcMain.on('localRequest', (event, pathArg) => {
        event.sender.send('response', ph.pathToJson(pathArg));
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
    });

    ipcMain.on('newWindowRequest', (event, arg) => {
        optionsWindow = new BrowserWindow({
            icon: path.join(__dirname, 'src/icons/folder128.ico'),
            width: 1200,
            height: 800
        });

        optionsWindow.loadURL(`file://${__dirname}/templates/config.html`);

        optionsWindow.on('closed', () => {
            event.sender.send('updateUserData', userData);
            mainWindow = null;
        });
    });

    ipcMain.on('addDisc', (event, aMsg) => {

        // TODO: Add disc and send message
    });

    ipcMain.on('updateDisc', (event, aMsg) => {
        // TODO: Update disc and send message
    });

    ipcMain.on('deleteDisc', (event, aMsg) => {
        // TODO: Delete disc and send message
    });
});

app.on('window-all-closed', () => {
    app.quit();
});

// Not needed for now TODO: If needed in future, make sure to change userData which is now an instance of UserData (not an array)
// function getAllDiscs() {
//     let allDiscsArray = [];
//
//     for (let i = 0; i < userData.local.length; i++) {
//         allDiscsArray.push(userData.local[i].alias);
//     }
//
//     for (let i = 0; i < userData.remote.length; i++) {
//         allDiscsArray.push(userData.remote[i].alias)
//     }
//
//     return allDiscsArray;
// }

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
