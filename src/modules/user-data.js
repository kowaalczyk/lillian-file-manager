'use strict';

const jsonfile = require('jsonfile');

function createResponse(valid, msg) {
    return {'valid': valid, 'message': msg};
}

class UserData {
    constructor(filePath = './.userData') {
        this._INITIAL_USER_DATA = {
            "local": [],
            "remote": [
                {
                    "alias": "test sleep",
                    "login": "user1",
                    "pass": "qweqweqwe",
                    "path": "\/folder2\/folder3\/folder4",
                    "type": "remote",
                    "url": "http:\/\/127.0.0.1:5000\/"
                },
                {
                    "alias": "test root",
                    "login": "user1",
                    "pass": "qweqweqwe",
                    "path": "\/",
                    "type": "remote",
                    "url": "http:\/\/127.0.0.1:5000\/"
                },
                {
                    "alias": "test error path",
                    "login": "user1",
                    "pass": "qweqweqwe",
                    "path": "\/cshcbsjcksncksncksncksnc",
                    "type": "remote",
                    "url": "http:\/\/127.0.0.1:5000\/"
                },
                {
                    "alias": "test error login",
                    "login": "csjnsjcn",
                    "pass": "csscscscsc",
                    "path": "\/",
                    "type": "remote",
                    "url": "http:\/\/127.0.0.1:5000\/"
                },
                {
                    "alias": "test stream",
                    "login": "user1",
                    "pass": "qweqweqwe",
                    "path": "\/folder3",
                    "type": "remote",
                    "url": "http:\/\/127.0.0.1:5000\/stream"
                }
            ]
        };

        this._filePath = filePath;

        try {
            this._userData = jsonfile.readFileSync(this._filePath);
        } catch (e) {
            console.log(e);
            this._userData = this._INITIAL_USER_DATA;
        }
    }

    /**
     * Returns object containing type and index by which loc can be retrieved
     */
    findLoc(alias) {
        for (let locType in this._userData) {
            for (let i = 0; i < this._userData[locType].length; i++) {
                if (this._userData[locType][i]['alias'] === alias) {
                    return {'locType': locType, 'index': i};
                }
            }
        }
        return null;  // not found
    }

    /**
     * Checks if provided alias is a local one (false does not mean it is remote, it can be undefined)
     */
    isLocal(alias) {
        const locInfo = this.findLoc(alias);

        if (locInfo) {
            return (locInfo['locType'] === 'local')
        } else {
            // location doesn't exist
            return false;
        }
    }

    aliasUsed(alias) {
        return !!(this.findLoc(alias));
    }

    /**
     * Returns full object that is present at @param[index] in array containing all objects of provided type.
     * Can throw TypeError or return null if bad index is specified.
     * Parameters {locType, index} - can be received by calling #findLoc
     */
    getLocByTypeAndIndex(parameters) {
        const {locType, index} = parameters;
        return this._userData[locType][index];
    }

    getLocByAlias(alias) {
        if (alias) {
            const locInfo = this.findLoc(alias);
            if (locInfo) {
                const {locType, index} = locInfo;
                return this._userData[locType][index];
            }
        }

        return null;
    }

    /**
     * Creates new location to the file.
     * Assumes updatedLocation is a json in location format same as the one used for storage,
     * and locType is a string.
     */
    createLocation(locType, newLocation) {
        const alias = newLocation['alias'];

        if (this.aliasUsed(alias)) {
            return createResponse(false, 'Alias already used.');
        } else {
            this._userData[locType].push(newLocation);
            return {'valid' : true, 'msg' : 'Location has been created.'};
        }
    }


    /**
     * Updates location stored in file.
     * Assumes updatedLocation is a json in location format same as the one used for storage,
     * and locType is a string.
     */
    updateLocation(updatedLocation, oldAlias = null) {
        const newAlias = updatedLocation['alias'];
        let locInfo;

        if (oldAlias && (newAlias !== oldAlias)) {
            // update requires renaming the location
            if (this.aliasUsed(newAlias)) {
                return {'valid': false, 'msg': 'New alias is already used.'}
            }

            locInfo = this.findLoc(oldAlias);
        } else {
            // no renaming required
            locInfo = this.findLoc(newAlias);
        }

        if (locInfo) {
            const {locType, index} = locInfo;
            this._userData[locType].splice(index, 1);
            this._userData[locType].push(updatedLocation);
            return createResponse(true, 'Location has been updated.');
        } else {
            return createResponse(false, 'Previous location does not exist.');
        }
    }

    /**
     * Attempts to remove location alias,
     * returns appropriate message (success or error) that can be sent to renderer.
     */
    removeLocation(alias) {
        if (!this.aliasUsed(alias)) {
            return createResponse(false, 'Location does not exist.');
        } else {
            const {locType, index} = this.findLoc(alias);
            this._userData[locType].splice(index, 1);
            return {'valid' : true, 'msg' : 'Location has been removed.'};
        }
    }

    /**
     * Returns userData object which has keys for each location type, each pointing to an array of aliases.
     */
    dumpToFile() {
        jsonfile.writeFileSync(this._filePath, this._userData);
    }

    /**
     * Returns userData object which has keys for each location type, each pointing to an array of aliases.
     */
    data() {
        return this._userData;
    }
}

module.exports = UserData;
