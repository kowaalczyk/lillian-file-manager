'use strict';

const electron = require('electron');
const os = require('os');
const {app, BrowserWindow, ipcMain} = electron;
const fs = require('fs');
const path = require('path');
const invalidJson = {valid:false};

const NUM_OF_ARGS = 3;

let mainWindow = null;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600
    });

    mainWindow.loadURL(`file://${__dirname}/templates/index.html`);

    ipcMain.on('ready', (event) => {
<<<<<<< HEAD
        if (process.argv.length === NUM_OF_ARGS) {
            event.sender.send('response', pathToJson(process.argv[NUM_OF_ARGS - 1]));
        } else if (process.argv.length !== NUM_OF_ARGS - 1) {
=======
        if (process.argv.length === 2) {
            event.sender.send('response', pathToJson(process.argv[1]));
        } else if (process.argv.length !== 1) {
>>>>>>> origin/master
            console.error('Wrong arguments!');
            mainWindow.close()
        }
    });

});

// // Listen for async message from renderer process
ipcMain.on('request', (event, pathArg) => {
    event.sender.send('response', pathToJson(pathArg));
});

// Old implementation of extractPath:
function extractPathDirsOld(pathArg) {
    'use strict';
    let dividedPath = [];
    let parentsPaths = [];
    if (pathArg !== path.sep) {
        let parsedPath = path.parse(pathArg);
        dividedPath = parsedPath.dir.split(path.sep);

        let root = parsedPath.root;
        dividedPath[0] = root;
        parentsPaths[0] = root;

        for (let i = 1; i < dividedPath.length; i++) {
            let new_link = parentsPaths.slice(-1)[0] + dividedPath[i] + path.sep;
            // let new_link = path.join(parentsPaths.slice(-1)[0], dividedPath[i]);
            parentsPaths.push(new_link);
        }
    }

    console.log(dividedPath);
    console.log(parentsPaths);
    return {dividedPath:dividedPath, parentPaths:parentsPaths}
}

// I assume that there is something more than just root in the pathObject
function splitLinux(pathObject) {
    let pathList = pathObject.dir.split(path.sep);
    pathList[0] = pathObject.root;

    // In case '/home' dir is '/' and split returns ['', '']
    if (pathObject.dir === pathObject.root) {
        pathList = pathList.slice(0, 1);
    }

    return pathList;
}

function getLinksLinux(dividedPath, root) {
    let parentsPaths = [root];

    for (let i = 1; i < dividedPath.length; i++) {

        let new_link = parentsPaths[parentsPaths.length - 1] + dividedPath[i] + path.sep;
        parentsPaths.push(new_link);
    }

    return parentsPaths;
}

// I assume that there is something more than just root in the pathObject
function splitWindows(pathObject) {
    return pathObject.dir.split(path.sep);
}

function getLinksWindows(dividedPath, root) {
    let parentsPaths = [root];

    for (let i = 1; i < dividedPath.length; i++) {

        let new_link = parentsPaths[parentsPaths.length - 1] + dividedPath[i] + path.sep;
        parentsPaths.push(new_link);
    }

    return parentsPaths;
}

function extractPathDirs(pathArg) {
    'use strict';

    // Default for case of root dir
    let dividedPath = [];
    let parentsPaths = [];

    let parsedPath = path.parse(pathArg);

    if (pathArg !== parsedPath.root) {

        if (os.platform() === 'linux') {
            console.log('DEBUGGING CHECK: we are on Linux');

            dividedPath = splitLinux(parsedPath);
            parentsPaths = getLinksLinux(dividedPath, parsedPath.root);
        } else {
            console.log('DEBUGGING CHECK: we are on Windows');

            dividedPath = splitWindows(parsedPath);
            parentsPaths = getLinksWindows(dividedPath, parsedPath.root);
        }
    }

    return {dividedPath:dividedPath, parentPaths:parentsPaths}
}

function errorHandler(err) {
    console.error('ERROR: ' + err);
    return invalidJson;
}

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

            // Make sure that at the end of a path there is / or \:
            if (pathArg.slice(-1) !== path.sep) {
                pathArg += path.sep;
            }
            // pathArg now always ends on path.sep ('/' or w/e windows has)

            for (let item of items) {
                let pathToItem = pathArg + item;
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

