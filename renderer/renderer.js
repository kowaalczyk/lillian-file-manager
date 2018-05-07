const fs = require('fs');
/**
 * We create an object from electron module. The shell object allows us to open the selected file
 */
const {shell} = require('electron');

function handleError(err) {
    console.error('There was an error reading the file!', err);

    alert('There was an error reading the file!');
}

function displayFolderContent(path) {
    fs.readdir(path, (err, files) => {
        'use strict';

        if (err) handleError(err);
        else {
            //Dynamically add <ol> tags to the div
            document.getElementById('listed-files').innerHTML = `<ol id="display-files"></ol>`;
            for (let file of files) {
                fs.stat(path + file, (err, stats) => {
                    /**
                     *When you double click on a folder or file, we need to obtain the path and name so that we can use it to take action. The easiest way to obtain the path and name for each file and folder, is to store that information in the element itself, as an ID. this is possible since we cannot have two files with the same name in a folder. theID variable below is created by concatenating the path with file name and a / at the end. As indicated earlier, we must have the / at the end of the path.
                     *
                     */
                    let theID = `${path}${file}/`;
                    if (err) handleError(err);
                    else {
                        if (stats.isDirectory()) {
                            /**
                             * Add an ondblclick event to each item. With folders, call this same function (recursion) to read the contents of the folder. If its a file, call the openFile function to open the file with the default app.
                             *
                             */
                            document.getElementById('display-files').innerHTML += `<div id=${theID} ondblclick="displayAllPanels(this.id)" class="uk-flex uk-flex-column uk-flex-middle uk-width-small"><img src="../img/icon64.png" width="64" height="64"><span class="uk-text-truncate">${file}</span></div>`;
                        }
                        else {
                            document.getElementById('display-files').innerHTML += `<div class="uk-flex uk-flex-column uk-flex-middle uk-width-small"><img src="../img/file64.png" width="64" height="64"><span class="uk-text-truncate">${file}</span></div>`;
                            //document.getElementById('display-files').innerHTML += `<li id=${theID} ondblclick="openFile(this.id)"><img src="../img/file64.png" width="64" height="64">${file}</li>`;
                        }
                    }
                });
            }
        }
    });
}

function displayPathDirs(myPath) {
    document.getElementById('listed-dirs').innerHTML = `<ul id="display-dirs"></ul>`;

    let path = require('path');
    let parsedPath = path.parse(myPath);
    let dirs = parsedPath.dir.split(path.sep);
    let dirs_links = [];

    let root = parsedPath.root;
    dirs[0] = root;
    dirs_links[0] = root;
    document.getElementById('display-dirs').innerHTML += `<li class="uk-active"><a onclick="displayAllPanels('${root}')">${root}</a></li>`;

    for (let i = 1; i < dirs.length; i++) {
        document.getElementById('display-dirs').innerHTML += `<hr class="uk-margin-remove">`;

        let new_link = dirs_links.slice(-1)[0] + dirs[i] + path.sep;
        dirs_links.push(new_link);

        document.getElementById('display-dirs').innerHTML += `<li class="uk-active"><a onclick="displayAllPanels('${dirs_links[i]}')">${dirs[i]}</a></li>`
    }
}

function openFromNav() {
    let input = document.getElementById("path-input").value;
    displayAllPanels(input);
}

function displayTopPanel(path) {
    document.getElementById('nav-bar').innerHTML = `<input id="path-input" class="uk-input" type="text" value=${path}>`;
    document.getElementById('nav-bar').innerHTML += `<a onclick="openFromNav()" class="uk-form-icon uk-form-icon-flip" uk-icon="icon: play"></a>`;
}

function displayAllPanels(path) {
    displayFolderContent(path);
    displayPathDirs(path);
    displayTopPanel(path);
}
