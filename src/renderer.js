const {ipcRenderer} = require('electron');

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
    img.height = 128;
    img.width = 128;
    div.appendChild(img);

    let caption = document.createElement('div');
    caption.className = "uk-text-truncate";
    caption.textContent = name;
    div.appendChild(caption);
    UIkit.tooltip(div, {pos: 'bottom', animation: false, title: name});

    return div;
}

function renderLeftNav(directories, parentPaths) {
    const leftNav = document.getElementById("left-nav");
    removeChildren(leftNav);

    let holder = document.createDocumentFragment();
    for (let i = 0; i < directories.length; i++) {
        const directory = directories[i];
        let li = document.createElement('li');
        let a = document.createElement('a');
        a.className = "uk-link-text";
        a.textContent = directory;
        li.appendChild(a);

        a.addEventListener("click", () => {
            const path = parentPaths[i];
            console.log(path);
            sendRequest(path);
        });

        holder.appendChild(li);
    }

    leftNav.appendChild(holder);
}

function renderMainSection(folders, files, currentPath) {
    const mainSection = document.getElementById("main-section");
    removeChildren(mainSection);

    let holder = document.createDocumentFragment();
    for (let folder of folders) {
        let div = createObjectDiv(folder, "../icons/folder128.png", currentPath);
        div.addEventListener("dblclick", () => {
            const path = currentPath + folder;
            sendRequest(path);
        });
        holder.appendChild(div);
    }

    for (let file of files) {
        let div = createObjectDiv(file, "../icons/file128.png", currentPath);
        holder.appendChild(div);
    }

    mainSection.appendChild(holder);
}

function renderResponse(response) {
    const {path, filesNames, dirsNames, dividedPath, parentPaths} = response;

    const pathInput = document.getElementById("path-input");
    pathInput.value = path;

    renderLeftNav(dividedPath, parentPaths);
    renderMainSection(dirsNames, filesNames, path);
}

function sendRequest(path) {
    ipcRenderer.send('request', path);
}

document.addEventListener("DOMContentLoaded", () => {
    // tell main process that you're ready
    ipcRenderer.send('ready');

    // handle response
    ipcRenderer.on('response', (event, response) => {
        const {valid} = response;

        if (valid) {
            renderResponse(response);
        } else {
            // handle error
            alert("Cannot open directory.");
        }
    });

    const pathForm = document.getElementById("path-form");
    const pathInput = document.getElementById("path-input");
    const pathButton = document.getElementById("path-button");

    pathButton.addEventListener("click", () => {
        sendRequest(pathInput.value);
    });

    pathForm.addEventListener("submit", (event) => {
        event.preventDefault();
        sendRequest(pathInput.value);
    });
});