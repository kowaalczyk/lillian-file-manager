'use strict';

const ph = require('./path-handling.js');
const normalizeURL = require('normalize-url');
const oboe = require('oboe');

function killStream(stream) {
    if (stream !== null) {
        stream.abort();
        stream = null;
    }
}


function sendError(event) {
    const errorResponse = {
        valid: false
    };
    event.sender.send('response', errorResponse);
}

function addExtraAndSend(sessionId, event, validJsonReply) {
    validJsonReply.isLocal = false;
    validJsonReply.id = sessionId;

    event.sender.send('response', validJsonReply);
}

function parseRemoteJsonChunk(arr, rMsg) {
    if (!arr || !arr[0]) {
        return null;
    }

    if (arr[0].m) {
        return {
            valid: false,
            message: arr[0].m
        }
    }

    const files = arr.filter(item => (item.k === 'f')).map(f => f.n);
    const dirs = arr.filter(item => (item.k === 'd')).map(d => d.n);
    const {dividedPath, parentPaths} = ph.extractPathDirs(rMsg.path, true);

    return {
        isLocal: false,
        alias: rMsg.alias,
        dividedPath: dividedPath,
        parentPaths: parentPaths,
        path: ph.normalizeRemotePath(rMsg.path),
        filesNames: files,
        dirsNames: dirs,
        valid: true
    };
}

function customNormalizeURL(url) {
    const regex = /((?:http|https):\/\/)(localhost)((?:[\/:])?.*)/;
    const normalizedUrl = normalizeURL(url);
    const match = normalizedUrl.match(regex);

    if (match == null) {
        return normalizedUrl;
    } else {
        return (match[1] + '127.0.0.1' + match[3]);
    }
}

/**
 * Handles request for folder on remote disk.
 * @param event
 * @param rMsg
 * @param userData
 * @returns last active stream (can be killed when loading is terminated)
 */
function handleRemoteRequest(event, rMsg, userData) {
    let activeStream = null;

    const locTypeAndIndex = userData.findLoc(rMsg.alias);
    const current_session_id = rMsg.id;

    if (locTypeAndIndex === null) {
        console.log("[DEBUG] localTypeAndIndex -> doesn't exist:");
        sendError(event);
    } else {
        const locData = userData.getLocByTypeAndIndex(locTypeAndIndex);

        // Bug fix: left panel
        if (rMsg.path !== '/' && rMsg.path.slice(-1) === '/') {
            rMsg.path = rMsg.path.slice(0, -1);
        }

        console.log(locData.url + `?l=${locData.login}&p=${locData.pass}&q=${rMsg.path}`);

        const arr = [];
        const apiUrl = locData.url + `?l=${locData.login}&p=${locData.pass}&q=${rMsg.path}`;
        try {
            activeStream = oboe({
                method: 'POST',
                url: customNormalizeURL(apiUrl),
                agent: false,
                json: locData
            }).start((status, headers) => {
                console.log("[DEBUG] On start:");
                console.log(status, headers);
            }).node('!.*', (data) => {
                arr.push(data);

                if (arr.length === 10) {
                    const array_copy = arr.slice();
                    arr.length = 0;  // truncate array
                    const parsedObjects = parseRemoteJsonChunk(array_copy, rMsg);
                    addExtraAndSend(current_session_id, event, parsedObjects);
                }
            }).fail((error) => {
                console.error(error);
                if (error.jsonBody) {
                    const parsedObjects = parseRemoteJsonChunk(error.jsonBody, rMsg);
                    addExtraAndSend(current_session_id, event, parsedObjects);
                } else {
                    sendError(event);
                }
            }).done((response) => {
                console.log(response);
                if (arr.length !== 0) {
                    addExtraAndSend(current_session_id, event, parseRemoteJsonChunk(arr, rMsg));
                }

                event.sender.send('endOfStream');
            });
        } catch (e) {
            console.error(e);
            sendError(event);
        }
        return activeStream;
    }
}

/**
 * Handles request for folder on local disk.
 * @param event
 * @param pathArg
 * @returns last active stream (can be killed when loading is terminated)
 */
function handleLocalRequest(event, pathArg) {
    let replyMsg = ph.pathToJson(pathArg);
    replyMsg["isLocal"] = true;
    replyMsg["alias"] = "";
    event.sender.send('response', replyMsg);
    event.sender.send('endOfStream');
    return null;  // loading local folders is not performed chunk-by-chunk (yet)
}

module.exports = {
    handleRemoteRequest,
    handleLocalRequest,
    killStream
};
