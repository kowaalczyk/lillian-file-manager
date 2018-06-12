'use strict';

const uuid = require('uuid/v1');
const {ipcRenderer} = require('electron');

let requestId = null;
let responseId = null;
let currentLocation = null;

function removeChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function createObjectDiv(name, iconPath) {
    let div = document.createElement('div');
    div.className = "object uk-flex uk-flex-column uk-flex-middle uk-width-small";

    let img = document.createElement('img');
    img.src = iconPath;
    img.height = 64;
    img.width = 64;
    div.appendChild(img);

    let caption = document.createElement('div');
    caption.className = "uk-text-truncate";
    caption.textContent = name;
    div.appendChild(caption);
    UIkit.tooltip(div, {pos: 'bottom', animation: false, title: name});

    return div;
}

function renderPanelLocal(names, paths, panelId) {
    const pathNav = document.getElementById(panelId);
    removeChildren(pathNav);

    let holder = document.createDocumentFragment();

    // Create a list of: <li><a class="uk-link-text">directory</a></li>
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = "uk-link-text";
        a.textContent = name;
        li.appendChild(a);

        a.addEventListener("click", () => {
            const path = paths[i];
            console.log(path);
            sendLocalRequest(path);
        });

        holder.appendChild(li);
    }

    pathNav.appendChild(holder);
}

function renderPanelRemote(names, paths, panelId, alias = null) {
    const pathNav = document.getElementById(panelId);
    removeChildren(pathNav);

    const holder = document.createDocumentFragment();

    // Creates a list of: <li><a class="uk-link-text">directory</a></li>
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = "uk-link-text";
        a.textContent = name;
        li.appendChild(a);

        a.addEventListener("click", () => {
            if (alias == null) {
                const path = paths[i];
                sendRemoteRequest(name, path);
            } else {
                const path = paths[i];
                sendRemoteRequest(alias, path);
            }
        });

        holder.appendChild(li);
    }

    pathNav.appendChild(holder);
}

function renderLocationLabel(name) {
    console.log(name);
    const label = document.getElementById("location-label");
    label.textContent = name;

}

function renderMainSection(isLocal, alias, folders, files, currentPath, reset = true) {
    const mainSection = document.getElementById("main-section");

    console.log(currentPath);

    if (reset) {
        removeChildren(mainSection);
    }

    const holder = document.createDocumentFragment();
    for (let folder of folders) {
        const div = createObjectDiv(folder, "../../icons/folder128.png", currentPath);
        div.addEventListener("dblclick", () => {
            const path = currentPath + folder;

            if (isLocal) {
                sendLocalRequest(path);
            } else {
                sendRemoteRequest(alias, path);
            }
        });
        holder.appendChild(div);
    }

    for (let file of files) {
        const div = createObjectDiv(file, "../../icons/file128.png", currentPath);
        holder.appendChild(div);
    }

    mainSection.appendChild(holder);
}

function showError(message) {
    const errorIcon = document.getElementById("error-icon");
    errorIcon.hidden = false;

    const errorMessage = document.getElementById("error-message");
    errorMessage.textContent = message;
}

function hideError() {
    const errorIcon = document.getElementById("error-icon");
    errorIcon.hidden = true;

    const errorMessage = document.getElementById("error-message");
    errorMessage.textContent = "\u200b";
}

function showSpinner() {
    const spinner = document.getElementById("spinner");
    spinner.style.visibility = "visible";
}

function hideSpinner() {
    const spinner = document.getElementById("spinner");
    spinner.style.visibility = "hidden";
}

function renderResponse(response) {
    console.log(response);
    const {path, filesNames, dirsNames, dividedPath, parentPaths, isLocal, alias} = response;

    const pathInput = document.getElementById("path-input");
    pathInput.value = path;

    renderLocationLabel(isLocal ? 'Local' : alias);

    if (isLocal) {
        currentLocation = null;
        renderPanelLocal(dividedPath, parentPaths, "path-nav");
        renderMainSection(isLocal, alias, dirsNames, filesNames, path);
    } else {
        currentLocation = alias;
        const {id} = response;
        console.log(requestId, responseId);
        if (id === requestId && id !== responseId) {
            responseId = requestId;
            renderPanelRemote(dividedPath, parentPaths, "path-nav", alias);
            renderMainSection(isLocal, alias, dirsNames, filesNames, path, true);
        } else if (id === responseId && id === responseId) {
            renderMainSection(isLocal, alias, dirsNames, filesNames, path, false);
        } else {
            console.log("wrong response id");
        }
    }
}

function sendLocalRequest(path) {
    showSpinner();
    ipcRenderer.send('localRequest', path);
}

function sendRemoteRequest(alias, path) {
    showSpinner();
    requestId = uuid();
    const data = {
        id: requestId,
        alias: alias,
        path: path
    };

    ipcRenderer.send('remoteRequest', data);
    console.log(data);
}

function sendWindowRequest() {
    ipcRenderer.send('newWindowRequest');
}

document.addEventListener("DOMContentLoaded", () => {
    // tell main process that you're ready
    ipcRenderer.send('ready');

    // handle response
    ipcRenderer.on('response', (event, response) => {
        const {valid} = response;

        if (valid) {
            hideError();
            renderResponse(response);
        } else {
            // handle error
            if (response.message === undefined) {
                console.log(response);
                showError("Cannot open directory");
            } else {
                showError(response.message);
            }

            hideSpinner();
        }
    });

    ipcRenderer.on('updateUserData', (event, response) => {
        const {local, remote} = response;
        local.sort((a, b) => (a.alias > b.alias) - (a.alias < b.alias));
        remote.sort((a, b) => (a.alias > b.alias) - (a.alias < b.alias));
        console.log(response);
        renderPanelLocal(local.map(object => object.alias), local.map(object => object.path), 'local-nav');
        renderPanelRemote(remote.map(object => object.alias), remote.map(object => object.path), 'remote-nav');
    });

    ipcRenderer.on('endOfStream', (event) => {
        hideSpinner();
    });

    const pathForm = document.getElementById("path-form");
    const pathInput = document.getElementById("path-input");
    const pathButton = document.getElementById("path-button");

    pathButton.addEventListener("click", () => {
        if (currentLocation == null) {
            sendLocalRequest(pathInput.value);
        } else {
            sendRemoteRequest(currentLocation, pathInput.value);
        }
    });

    pathForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (currentLocation == null) {
            sendLocalRequest(pathInput.value);
        } else {
            sendRemoteRequest(currentLocation, pathInput.value);
        }
    });

    const configButton = document.getElementById("config-button");
    configButton.addEventListener("click", () => {
        sendWindowRequest();
    });

    document.addEventListener("drop", (e) => {
        e.preventDefault();
    });

    document.addEventListener("dragover", (e) => {
        e.preventDefault();
    });
});
