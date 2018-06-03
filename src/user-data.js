const jsonfile = require('jsonfile');

class UserData {
    constructor(filePath = './.userData') {
        this._filePath = filePath;
        this._userData = jsonfile.readFileSync(this._filePath);
    }

    /**
     * Returns object containing type and index by which
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

    /**
     * Returns full object that is present at @param[index] in array containing all objects of provided type.
     * Can throw TypeError or return null if bad index is specified.
     * @param parameters {locType, index} - can be received by calling #findLoc
     */
    getLocByTypeAndIndex(parameters) {
        const {locType, index} = parameters;
        return this._userData[locType][index];
    }

    /**
     * Updates location stored in file.
     * Assumes updatedLocation is a json in location format same as the one used for storage,
     * and locType is a string.
     */
    update(locType, updatedLocation) {
        const locData = findLoc(updatedLocation['alias']);

        if (locData) {
            // loc with a given alias already exists in the userData
            const foundLocType = locData['locType'];
            const foundLocIndex = locData['index'];

            if (foundLocType !== locType) {
                return {'valid': false, 'msg': 'Alias is already used.'};
            } else {
                // update existing location
                this._userData[locType][foundLocIndex] = updatedLocation;
                return {'valid': true, 'msg': 'Existing location updated.'};
            }

        } else {
            // adding new location
            this._userData[locType].push(updatedLocation);
            return {'valid': true, 'msg': 'New location added.'};
        }
        // TODO: Save to file
    }

    /**
     * Attempts to remove location alias,
     * returns appropriate message (success or error) that can be sent to renderer.
     */
    removeLocation(alias) {  // TODO: Test
        const locData = findLoc(alias);

        if (locDdata) {
            // loc with a given alias already exists in the userData, remove it
            const locType = locData['locType'];
            const index = locData['index'];
            this._userData[locType].splice(index, 1);
            return {'valid': true, 'msg': 'Location has been removed.'};
        } else {
            return {'valid': false, 'msg': 'Location does not exist.'};
        }
    }

    /**
     * Returns userData object which has keys for each location type, each pointing to an array of aliases.
     */
    data() {
        return this._userData;
    }
}

module.exports = UserData;
