'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');

const invalidJson = {valid: false};

// Assuming that there is something more than just root in the pathObject
function splitLinux(pathObject) {
    let pathList = pathObject.dir.split('/');
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

        let new_link = parentsPaths[parentsPaths.length - 1] + dividedPath[i] + '/';
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

function extractPathDirs(pathArg, remote = false) {
    // Default for case of root dir
    let dividedPath = [];
    let parentsPaths = [];

    let parsedPath = path.parse(pathArg);

    if (pathArg !== parsedPath.root) {

        if (remote || os.platform() === 'linux') {

            dividedPath = splitLinux(parsedPath);
            parentsPaths = getLinksLinux(dividedPath, parsedPath.root);
        } else {

            dividedPath = splitWindows(parsedPath);
            parentsPaths = getLinksWindows(dividedPath, parsedPath.root);
        }
    }

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

    if (pathArg === '') {
        return {
            'dividedPath': [''],
            'parentPaths': [''],
            'path': '',
            'filesNames': [],
            'dirsNames': [],
            'valid': true,
            'isLocal': true,
            'alias': 'Local'
        }
    } else {
        try {
            let normPathArg = path.normalize(pathArg);

            // WINDOWS: corrects path typed by user, example:
            // C: after normalization becomes C:., which is corrected to C:\
            if (normPathArg.length === 3) {
                normPathArg = normPathArg.replace(/:.$/,":\\")
            }

            /*
                LINUX:
                path.normalize('/foo/bar//baz/asdf/quux/..');
                Returns: '/foo/bar/baz/asdf'

                WINDOWS:
                path.normalize('C:\\temp\\\\foo\\bar\\..\\');
                Returns: 'C:\\temp\\foo\\'
            */

            if (fs.existsSync(normPathArg)) {
                let items = fs.readdirSync(normPathArg);
                let filesNames = [];
                let dirsNames = [];

                // Make sure that at the end of a path there is / or \:
                // normPathArg now always ends on path.sep ('/' or w/e windows has)
                if (normPathArg.slice(-1) !== path.sep) {
                    normPathArg += path.sep;
                }

                for (let item of items) {
                    const pathToItem = normPathArg + item;

                    try {
                        const stats = fs.statSync(pathToItem);

                        if (stats.isDirectory()) {
                            dirsNames.push(item);
                        } else {
                            filesNames.push(item);
                        }
                    } catch (err) {
                        // do not display item when fs.stat throws error (permission error)
                        // this is actually not an error, logging only for debug
                        console.log(err);
                    }
                }

                const pathDirsJson = extractPathDirs(normPathArg);
                pathDirsJson['path'] = normPathArg;
                const folderContentJson = {
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
}

function normalizeRemotePath(pathArg) {
    // Make sure that at the end of a path there is /
    if (pathArg.slice(-1) !== '/') {
        pathArg += '/';
    }

    return pathArg;
}

module.exports = {
    pathToJson,
    extractPathDirs,
    normalizeRemotePath
};
