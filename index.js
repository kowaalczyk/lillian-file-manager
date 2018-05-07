/*
Use object literal notation to create two objects
 */
const {app,BrowserWindow}=require('electron');
const electron = require('electron');

/*
Create a callback to handle the ready event.
 */
app.on('ready',event=>{
    'use strict';
    const win = new BrowserWindow({width:800,height:600});

    if (process.argv.length === 3) {
        global.sharedObject = {prop1: process.argv};
        win.loadURL(`file://${__dirname}/static/html/practice_tomek.html`);
    }
    else {
        console.error('Wrong arguments!');
        win.close()
    }
});