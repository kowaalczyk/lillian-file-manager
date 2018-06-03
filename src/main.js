'use strict';

const electron = require('electron');
const os = require('os');
const {app, BrowserWindow, ipcMain} = electron;
const fs = require('fs');
const path = require('path');
const isDev = require('electron-is-dev');


const invalidJson = {valid: false};
const NUM_OF_ARGS = isDev ? 3 : 2;  // in dev mode, electron offsets argument by 1

// disable logging in production
if (!isDev) {
    console.log = function() {};
}


let mainWindow = null;
let userData = null;
let userDataFile = './.userdata';

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

    userData = JSON.parse(userDataFile);


    // Parse command line arguments
    ipcMain.on('ready', (event) => {
        if (process.argv.length !== NUM_OF_ARGS - 1) {
            console.error('Wrong arguments!');
            mainWindow.close();
        } else {
            event.sender.send('response', getAllDiscs());

            if (process.argv.length === NUM_OF_ARGS) {
                event.sender.send('response', pathToJson(process.argv[NUM_OF_ARGS - 1]));
            }
        }
    });

    // Listen for async message from renderer process
    ipcMain.on('request', (event, pathArg) => {
        event.sender.send('response', pathToJson(pathArg));
    });
});

app.on('window-all-closed', () => {
    app.quit();
});

function getAllDiscs() {
    let allDiscsArray = [];

    for(let i = 0; i < userData["local"].length; i++) {
        allDiscsArray.push(userData["local"][i]["alias"]);
    }

    for(let i = 0; i < userData["remote"].length; i++) {
        allDiscsArray.push(userData["remote"][i]["alias"])
    }

    return allDiscsArray;
}

function findLoc(alias) {
    for (let locType of userData) {
        for(let i = 0; i < userData[locType].length; i++) {
            if (userData[locType][i]["alias"] === alias) {
                return {"locType" : locType, "index" : i};
            }
        }
    }

    return null;
}

function isLocal(rMsg) {
    let locInfo = findLoc(rMsg["alias"]);

    if (locInfo) {
        return (locInfo["locType"] === "local")
    } else {
        // location doesn't exist
        return null;
    }
}

// Assuming that there is something more than just root in the pathObject
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

// Assuming that there is something more than just root in the pathObject
function splitWindows(pathObject) {
    let pathList = pathObject.dir.split(path.sep);

    if (pathObject.dir === pathObject.root) {
        pathList = pathList.slice(0, 1);
    }

    return pathList;
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

    console.log(dividedPath);
    console.log(parentsPaths);
    return {dividedPath: dividedPath, parentPaths: parentsPaths}
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
        let normPathArg = path.normalize(pathArg);
        // LINUX:
        // path.normalize('/foo/bar//baz/asdf/quux/..');
        // Returns: '/foo/bar/baz/asdf'

        // WINDOWS:
        // path.normalize('C:\\temp\\\\foo\\bar\\..\\');
        // Returns: 'C:\\temp\\foo\\'

        if (fs.existsSync(normPathArg)) {
            let items = fs.readdirSync(normPathArg);
            let filesNames = [];
            let dirsNames = [];

            // Make sure that at the end of a path there is / or \:
            if (normPathArg.slice(-1) !== path.sep) {
                normPathArg += path.sep;
            }
            // normPathArg now always ends on path.sep ('/' or w/e windows has)

            for (let item of items) {
                let pathToItem = normPathArg + item;

                try {
                    let stats = fs.statSync(pathToItem);

                    if (stats.isDirectory()) {
                        dirsNames.push(item);
                    } else {
                        filesNames.push(item);
                    }
                } catch (err) {
                    // do not display item when fs.stat throws error (permission error)
                }
            }

            let pathDirsJson = extractPathDirs(normPathArg);
            pathDirsJson['path'] = normPathArg;
            let folderContentJson = {
                filesNames: filesNames,
                dirsNames: dirsNames,
                valid: true
            };

            return jsonConcat(pathDirsJson, folderContentJson);
        } else {
            return errorHandler();
        }

    } catch (err) {
        console.error(err);
        return errorHandler();
    }
}

