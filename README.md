# lillian-file-manager  
A file manager created in electron.js, assignment for software engneering course at MIM UW, spring semester 2017-18.  
https://github.com/kowaalczyk/lillian-file-manager/  

## Features  

Implemented:  
* view folder content  
* change folder by providing path, selecting subfolder or selecting folder from left menu  

Future:  
* connect to remote drives (https)  
* create and manage favourite folder shortcuts  
* connect to cloud drives (Google Drive, OneDrive, etc.)  
* connect to remote locations via SSH  

## Dev setup  

### Installation  
Install all project dependencies  
```shell
npm install  
```

### Running project  
Assuming you have node.js, npm and electron.js installed, in project folder execute:  
```shell
npm run main
```
to open application.  

### Deployment  
#### Windows  
Deploy electron application to build folder  
```shell
npm run deploy-win32  
```  
Package application for shipping  
```shell
npm run zip-win32  
```  
#### Linux  
Deploy electron application to build folder  
```shell
npm run deploy-linux  
```  
Package application for shipping  
```shell
npm run zip-linux  
```  

## License  

TODO  
