'use strict';

const electron = require('electron');
const path = require('path');
const ph = require('./path-handling.js');
const {app, BrowserWindow, ipcMain} = electron;
const isDev = require('electron-is-dev');
const jsonfile = require('jsonfile');

const NUM_OF_ARGS = isDev ? 3 : 2;  // in dev mode, electron offsets argument by 1

// disable logging in production
if (!isDev) {
    console.log = function() {};
}

let mainWindow = null;
let userData = null;
let userDataFile = './.userData';

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

    jsonfile.readFile(userDataFile, function(err, obj) {
        userData = obj;
        // console.log(userData);
        // for (var key in userData) {
        //     console.log(key);
        // }
    });


    // Parse command line arguments
    ipcMain.on('ready', (event) => {
        if (process.argv.length < NUM_OF_ARGS - 1 || process.argv.length > NUM_OF_ARGS) {
            console.error('Wrong arguments!');
            mainWindow.close();
        } else {
            event.sender.send('leftPanel', userData);

            if (process.argv.length === NUM_OF_ARGS) {
                event.sender.send('response', ph.pathToJson(process.argv[NUM_OF_ARGS - 1]));
            }
        }
    });

    // Listen for async message from renderer process
    ipcMain.on('request', (event, rMsg) => {
        // Old: event.sender.send('response', pathToJson(pathArg));
        if (isLocal('')) { // TODO rMsg['alias']
            event.sender.send('response', ph.pathToJson(concatPath(rMsg)));
        } else {
            // TODO: Loop through responses from server
            event.sender.send('response', parseRemoteJsonChunk());
        }
    });
});

app.on('window-all-closed', () => {
    app.quit();
});

// I assume that path in rMsg starts with / (or \)
function concatPath(rMsg) {
    return rMsg.alias.concat(rMsg.path);
}

// Not needed for now
function getAllDiscs() {
    let allDiscsArray = [];

    for(let i = 0; i < userData.local.length; i++) {
        allDiscsArray.push(userData.local[i].alias);
    }

    for(let i = 0; i < userData.remote.length; i++) {
        allDiscsArray.push(userData.remote[i].alias)
    }

    return allDiscsArray;
}

function findLoc(alias) {
    for (let locType in userData) {
        for(let i = 0; i < userData[locType].length; i++) {
            if (userData[locType][i]['alias'] === alias) {
                return {'locType' : locType, 'index' : i};
            }
        }
    }

    return null;
}

function isLocal(alias) {
    let locInfo = findLoc(alias);

    if (locInfo) {
        return (locInfo['locType'] === 'local')
    } else {
        // location doesn't exist
        return false;
    }
}

function updateUserData(locType, updatedLocation) {
    let locData = findLoc(updatedLocation['alias']);

    if (locData) {
        // loc with a given alias already exists in the userData
        let foundLocType = locData['locType'];
        let foundLocIndex = locData['index'];

        if (foundLocType !== locType) {
            return {'valid' : false, 'msg' : 'Alias is already used.'}
        } else {
            // update existing location
            userData[locType][foundLocIndex] = updatedLocation;
            return {'valid' : true, 'msg' : 'Existing location updated.'}
        }

    } else {
        // adding new location
        userData[locType].push(updatedLocation)
        return {'valid' : true, 'msg' : 'New location added.'}
    }
}

function parseRemoteJsonChunk(arr, isNew=false) {
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
