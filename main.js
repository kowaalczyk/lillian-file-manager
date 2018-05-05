const {app, BrowserWindow} = require('electron');
const fs = require('fs');
const path = require('path');
const url = require('url');

let win;

function createWindow() {
    console.log(new Date().getTime());

    win = new BrowserWindow({width: 800, hieght: 600});

    win.setMenu(null);

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'html/practice.html'),
        protocol: 'file:',
        slashes: true
    }));

    win.webContents.openDevTools();

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
    })
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
// On macOS it is common for applications and their menu bar
// to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
// On macOS it's common to re-create a window in the app when the
// dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow()
    }
});