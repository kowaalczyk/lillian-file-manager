'use strict'

const electron = require('electron');
const {app, BrowserWindow, ipcMain} = electron;
const fs = require('fs');
const path = require('path');
const invalidJson = {valid:false};

let mainWindow = null;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600
    });

    mainWindow.loadURL(`file://${__dirname}/templates/index.html`);

    ipcMain.on('ready', (event) => {
        if (process.argv.length === 3) {
            event.sender.send('response', pathToJson(process.argv[2]));
        } else if (process.argv.length !== 2) {
            console.error('Wrong arguments!');
            win.close()
        }
    });

});

// // Listen for async message from renderer process
ipcMain.on('request', (event, pathArg) => {
    event.sender.send('response', pathToJson(pathArg));
});

let testPathLinux = '/home/erhaven/Test/ s a s d /test sas ds da';
let testPathWind = 'C:\\Users\\kkowa\\Desktop\\lillian-win32-x64';
// console.log(pathToJson(testPath));
// console.log(fs.readdirSync(testPath));

function extractPathDirs(pathArg) {
    'use strict';
    let parsedPath = path.parse(pathArg);
    let dividedPath = parsedPath.dir.split(path.sep);
    let parentsPaths = [];

    let root = parsedPath.root;
    dividedPath[0] = root;
    parentsPaths[0] = root;

    for (let i = 1; i < dividedPath.length; i++) {
        let new_link = parentsPaths.slice(-1)[0] + dividedPath[i] + path.sep;
        parentsPaths.push(new_link);
    }

    return {dividedPath:dividedPath, parentPaths:parentsPaths}
}

function errorHandler(err) {
    console.error('ERROR: ' + err);
    return invalidJson;
    // event.sender.send('response', invalidJson);

}

//
// function createJson(err, items, callback) {
//     // create json
//     callback(err, items);
// }
//
// function sendJson(err, items) {
//     // send json
// }

function jsonConcat(json1, json2) {
    for (let key in json2) {
        json1[key] = json2[key];
    }

    return json1;
}

function pathToJson(pathArg) {
    'use strict';
    try {
        if (fs.existsSync(pathArg)) {
            let items = fs.readdirSync(pathArg);
            let filesNames = [];
            let dirsNames = [];

            if (pathArg.slice(-1) !== path.sep) {
                pathArg += path.sep;
            }

            // pathArg now always ends on path.sep ('/' or w/e windows has)

            for (let item of items) {
                let pathToItem = pathArg + item;
                // console.log(pathToItem);
                let stats = fs.statSync(pathToItem);

                if (stats.isDirectory()) {
                    dirsNames.push(item);
                } else {
                    filesNames.push(item);
                }
            }

            let pathDirsJson = extractPathDirs(pathArg);
            pathDirsJson['path'] = pathArg;
            let folderContentJson = {
                filesNames:filesNames,
                dirsNames:dirsNames,
                valid:true
            };

            return jsonConcat(pathDirsJson, folderContentJson);
        } else {
            return errorHandler();
        }

    } catch (err) {
        return errorHandler();
    }
}

