const {ipcRenderer, remote} = require('electron');
const main = remote.require("./main.js");

document.addEventListener("DOMContentLoaded", function () {
    ipcRenderer.send('ready');
    // ipcRenderer.send('request', "/usr/src/minix");
    // ipcRenderer.send('request', {name: "Tomek", age: 20, dogs: ["Burek", "Reksio"]});
    // ipcRenderer.send('request', 1, 2, 3, 4);
    // ipcRenderer.send('request', ["usr", "src", "minix"]);
});