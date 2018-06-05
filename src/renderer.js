const uuid = require('uuid/v1');
const {ipcRenderer} = require('electron');

let requestId = null;
let responseId = null;

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
    for (let i = 0; i < names.length; i++) {
        // <li><a class="uk-link-text">directory</a></li>
        const name = names[i];
        let li = document.createElement('li');
        let a = document.createElement('a');
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

function renderPanelRemote(names, paths, panelId) {
    const pathNav = document.getElementById(panelId);
    removeChildren(pathNav);

    let holder = document.createDocumentFragment();
    for (let i = 0; i < names.length; i++) {
        // <li><a class="uk-link-text">directory</a></li>
        const name = names[i];
        let li = document.createElement('li');
        let a = document.createElement('a');
        a.className = "uk-link-text";
        a.textContent = name;
        li.appendChild(a);

        a.addEventListener("click", () => {
            const path = paths[i];
            sendRemoteRequest(name, path);
        });

        holder.appendChild(li);
    }

    pathNav.appendChild(holder);
}

function renderLocationLabel(name) {
    const label = document.getElementById("location-label");
    label.textContent = name;
}

function renderMainSection(isLocal, alias, folders, files, currentPath, reset = true) {
    const mainSection = document.getElementById("main-section");

    console.log(currentPath);

    if (reset) {
        removeChildren(mainSection);
    }

    let holder = document.createDocumentFragment();
    for (let folder of folders) {
        let div = createObjectDiv(folder, "../icons/folder128.png", currentPath);
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
        let div = createObjectDiv(file, "../icons/file128.png", currentPath);
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
    renderPanelLocal(dividedPath, parentPaths, "path-nav");

    console.log(path);

    if (isLocal) {
        renderMainSection(isLocal, alias, dirsNames, filesNames, path);
    } else {
        const {id} = response;
        if (id === requestId && id !== responseId) {
            responseId = requestId;
            renderMainSection(isLocal, alias, dirsNames, filesNames, path, true);
        } else  if (id === responseId && id === responseId) {
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
            showError("Cannot open directory");
        }

        hideSpinner();
    });

    ipcRenderer.on('updateUserData', (event, response) => {
        const {local, remote} = response;
        console.log(response);
        renderPanelLocal(local.map(object => object.alias), local.map(object => object.path), 'local-nav');
        renderPanelRemote(remote.map(object => object.alias), remote.map(object => object.path), 'remote-nav');
    });

    const pathForm = document.getElementById("path-form");
    const pathInput = document.getElementById("path-input");
    const pathButton = document.getElementById("path-button");

    pathButton.addEventListener("click", () => {
        sendLocalRequest(pathInput.value);
    });

    pathForm.addEventListener("submit", (event) => {
        event.preventDefault();
        sendLocalRequest(pathInput.value);
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