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

    if (process.argv.length === 2) {
        console.error('No arguments!');
        global.sharedObject = {prop1: ''};
        win.loadURL(`file://${__dirname}/static/html/practice_tomek.html`);
    } else if (process.argv.length === 3) {
        // console.error('Argument!');
        global.sharedObject = {prop1: process.argv};
        win.loadURL(`file://${__dirname}/static/html/practice_tomek.html`);
    }
    else {
        console.error('Wrong arguments!');
        win.close()
    }
});