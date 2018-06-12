'use strict';

const {ipcRenderer} = require('electron');
const {getCurrentWindow} = require('electron').remote;

function reload() {
    getCurrentWindow().reload()
}

const state = {
    activeAlias: null,
    local: null,
    remote: null
};

function removeChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function isRemote(directory) {
    return ('url' in directory);
}

function sendUpdateRequest(data) {
    console.log(data);
    ipcRenderer.send('updateDisc', data);
}

function sendAddRequest(data) {
    ipcRenderer.send('addDisc', data);
}

function sendDeleteRequest(alias) {
    ipcRenderer.send('deleteDisc', alias);
}

function clearEventListeners(element) {
    let new_element = element.cloneNode(true);
    element.parentNode.replaceChild(new_element, element);
}

function hideRemoteEdit() {
    const form = document.getElementById('remote-edit-form');
    form.hidden = true;
}

function hideLocalEdit() {
    const form = document.getElementById('local-edit-form');
    form.hidden = true;
}

function showLocalEdit(directory) {
    state.activeAlias = directory.alias;

    hideRemoteEdit();

    const form = document.getElementById('local-edit-form');
    form.hidden = false;

    const nameInput = document.getElementById('local-edit-name');
    nameInput.value = directory.alias;

    const pathInput = document.getElementById('local-edit-path');
    pathInput.value = directory.path;
}

function showRemoteEdit(directory) {
    state.activeAlias = directory.alias;

    hideRemoteEdit();

    const form = document.getElementById('remote-edit-form');
    form.hidden = false;

    const nameInput = document.getElementById('remote-edit-name');
    nameInput.value = directory.alias;

    const pathInput = document.getElementById('remote-edit-path');
    pathInput.value = directory.path;

    const urlInput = document.getElementById('remote-edit-url');
    urlInput.value = directory.url;

    const loginInput = document.getElementById('remote-edit-login');
    loginInput.value = directory.login;

    const passwordInput = document.getElementById('remote-edit-password');
    passwordInput.value = directory.pass;
}

function renderList(data, listId) {
    /* Renders a list of:
        <li class="uk-flex">
            <div>alias</div>
            <div class="uk-flex-1"></div>
            <div>
                <a href="" uk-icon="icon: pencil"></a>
                <a href="" uk-icon="icon: trash"></a>
            </div>
        </li>
     */

    const list = document.getElementById(listId);
    removeChildren(list);

    const holder = document.createDocumentFragment();

    for (const directory of data) {
        const {alias} = directory;

        const li = document.createElement('li');
        li.className = 'uk-flex';

        const aliasDiv = document.createElement('div');
        aliasDiv.textContent = alias;
        li.appendChild(aliasDiv);

        const bufferDiv = document.createElement('div');
        bufferDiv.className = 'uk-flex-1';
        li.appendChild(bufferDiv);

        const buttonDiv = document.createElement('div');

        const pencilA = document.createElement('a');
        pencilA.setAttribute('uk-icon', 'icon: pencil');
        pencilA.href = "";
        pencilA.addEventListener("click", (event) => {
            event.preventDefault();

            if (isRemote(directory)) {
                showRemoteEdit(directory);
            } else {
                showLocalEdit(directory);
            }
        });
        buttonDiv.appendChild(pencilA);

        const trashA = document.createElement('a');
        trashA.setAttribute('uk-icon', 'icon: trash');
        trashA.href = "";
        buttonDiv.appendChild(trashA);
        trashA.addEventListener("click", (event) => {
            event.preventDefault();
            sendDeleteRequest(alias);
            reload();
        });
        li.appendChild(buttonDiv);

        holder.appendChild(li);
    }

    list.appendChild(holder);
}

function renderLeftPanel() {
    renderList(state.local.sort((a, b) => (a.alias > b.alias) - (a.alias < b.alias)), 'local-list');
    renderList(state.remote.sort((a, b) => (a.alias > b.alias) - (a.alias < b.alias)), 'remote-list');
}

function setupLocalEditListeners() {
    const nameInput = document.getElementById('local-edit-name');
    const pathInput = document.getElementById('local-edit-path');
    const form = document.getElementById('local-edit-form');
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = {
            "oldAlias": state.activeAlias,
            "locationData": {
                "alias": nameInput.value,
                "path": pathInput.value
            }
        };
        sendUpdateRequest(data);
        clearForm(form);
        hideLocalEdit();
    });

    const cancelButton = document.getElementById('local-edit-cancel');
    cancelButton.addEventListener('click', (event) => {
        event.preventDefault();
        hideLocalEdit();
    });
}

function clearForm(form) {
    console.log(form);
    for (const input of form.getElementsByTagName('input')) {
        console.log(input);
        input.value = "";
    }
}

function setupRemoteEditListeners() {
    const nameInput = document.getElementById('remote-edit-name');
    const urlInput = document.getElementById('remote-edit-url');
    const pathInput = document.getElementById('remote-edit-path');
    const loginInput = document.getElementById('remote-edit-login');
    const passwordInput = document.getElementById('remote-edit-password');
    const form = document.getElementById('remote-edit-form');

    form.addEventListener('submit', () => {
        event.preventDefault();
        const data = {
            "oldAlias": state.activeAlias,
            "locationData": {
                "alias": nameInput.value,
                "url": urlInput.value,
                "login": loginInput.value,
                "pass": passwordInput.value,
                "path": pathInput.value
            }
        };

        sendUpdateRequest(data);
        clearForm(form);
        hideRemoteEdit();
    });

    const cancelButton = document.getElementById('remote-edit-cancel');
    cancelButton.addEventListener('click', (event) => {
        event.preventDefault();
        hideRemoteEdit();
    });
}

function setupAddListeners() {
    const nameInput = document.getElementById('add-name');
    const pathInput = document.getElementById('add-path');
    const urlInput = document.getElementById('add-url');
    const loginInput = document.getElementById('add-login');
    const passwordInput = document.getElementById('add-password');

    const typeSelect = document.getElementById('add-select');
    typeSelect.addEventListener('change', () => {
        switch (typeSelect.value.toLowerCase()) {
            case "local":
                nameInput.parentElement.hidden = false;
                pathInput.parentElement.hidden = false;
                urlInput.parentElement.hidden = true;
                loginInput.parentElement.hidden = true;
                passwordInput.parentElement.hidden = true;
                break;

            case "remote":
                nameInput.parentElement.hidden = false;
                urlInput.parentElement.hidden = false;
                loginInput.parentElement.hidden = false;
                pathInput.parentElement.hidden = false;
                passwordInput.parentElement.hidden = false;
                break;
        }
    });

    const form = document.getElementById('add-form');
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const type = typeSelect.value.toLowerCase();
        const data = {
            type: type,
            locationData: {}
        };

        switch (type) {
            case "remote":
                data.locationData.type = type;
                data.locationData.alias = nameInput.value;
                data.locationData.path = pathInput.value;
                data.locationData.url = urlInput.value;
                data.locationData.login = loginInput.value;
                data.locationData.pass = passwordInput.value;
                break;

            case "local":
                data.locationData.type = type;
                data.locationData.alias = nameInput.value;
                data.locationData.path = pathInput.value;
                break;
        }

        sendAddRequest(data);
        clearForm(form);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupAddListeners();
    setupLocalEditListeners();
    setupRemoteEditListeners();

    ipcRenderer.on('actionResult', (event, response) => {
        console.log(response);
    });

    ipcRenderer.on('userConfig', (event, response) => {
        console.log(response);
        state.local = response.local;
        state.remote = response.remote;
        renderLeftPanel();
    });

    document.addEventListener("drop", (e) => {
        e.preventDefault();
    });

    document.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    // tell main process that you're ready
    ipcRenderer.send('userConfig');
});
