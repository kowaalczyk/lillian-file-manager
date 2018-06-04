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

function isRemote(directory) {
    return ('url' in directory);
}

function sendUpdateRequest(data) {
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

    const urlInput = document.getElementById('remote-edit-url');
    urlInput.value = directory.url;

    const loginInput = document.getElementById('remote-edit-login');
    loginInput.value = directory.login;

    const passwordInput = document.getElementById('remote-edit-password');
    passwordInput.value = directory.pass;
}

function renderList(data, listId) {
    /*
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
    const holder = document.createDocumentFragment();

    for (const directory of data) {
        const {alias} = directory;

        let li = document.createElement('li');
        li.className = 'uk-flex';

        let aliasDiv = document.createElement('div');
        aliasDiv.textContent = alias;
        li.appendChild(aliasDiv);

        let bufferDiv = document.createElement('div');
        bufferDiv.className = 'uk-flex-1';
        li.appendChild(bufferDiv);

        let buttonDiv = document.createElement('div');

        let pencilA = document.createElement('a');
        pencilA.setAttribute('uk-icon', 'icon: pencil');
        pencilA.href = "";
        pencilA.addEventListener("click", (event) => {
            event.preventDefault();

            if (isRemote(directory)) {
                console.log('remote');
                showRemoteEdit(directory);
            } else {
                showLocalEdit(directory);
            }
            console.log(directory);
        });
        buttonDiv.appendChild(pencilA);

        let trashA = document.createElement('a');
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
    renderList(state.local, 'local-list');
    renderList(state.remote, 'remote-list');
    // renderRemote(state.remote);
}

function setupLocalEditListeners() {
    const nameInput = document.getElementById('local-edit-name');
    const pathInput = document.getElementById('local-edit-path');
    const form = document.getElementById('local-edit-form');
    form.addEventListener('submit', () => {
        const data = {
            "oldAlias" : state.activeAlias,
            "locationData" :
                {
                    "alias" : nameInput.value,
                    "path" : pathInput.value
                }
        };
        console.log(data);
        sendUpdateRequest(data);
    });

    const cancelButton = document.getElementById('local-edit-cancel');
    cancelButton.addEventListener('click', (event) => {
        event.preventDefault();
        hideLocalEdit();
    });
}

function setupRemoteEditListeners() {
    const nameInput = document.getElementById('remote-edit-name');
    const urlInput = document.getElementById('remote-edit-url');
    const loginInput = document.getElementById('remote-edit-login');
    const passwordInput = document.getElementById('remote-edit-password');
    const form = document.getElementById('remote-edit-form');

    form.addEventListener('submit', () => {
        const data = {
            "oldAlias": state.activeAlias,
            "locationData" : {
                "alias" : nameInput.value,
                "url" : urlInput.value,
                "login" : loginInput.value,
                "pass" : passwordInput.value
            }
        };
        console.log(data);
        sendUpdateRequest(data);
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
                passwordInput.parentElement.hidden = false;

                pathInput.parentElement.hidden = true;
                break;
        }
    });

    const form = document.getElementById('add-form');
    form.addEventListener('submit', (event) => {
        const data = {
            "type" : typeSelect.value.toLowerCase(),
            "locationData" : {
                "alias" : nameInput.value,
                "path": pathInput.value,
                "url" : urlInput.value,
                "login" : loginInput.value,
                "pass" : passwordInput.value
            }
        };

        sendAddRequest(data);
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
        state.local = response.local;
        state.remote = response.remote;
        renderLeftPanel();
    });

    // tell main process that you're ready
    ipcRenderer.send('userConfig');
});