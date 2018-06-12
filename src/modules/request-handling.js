'use strict';

const ph = require('./path-handling.js');

function killStream(stream) {
    if (stream !== null) {
        stream.abort();
        stream = null;
    }
}

function handleRemoteRequest(event, rMsg, activeStream) {
    killStream(activeStream);
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
        activeStream = oboe({
            method: 'POST',
            url: locData.url + `?l=${locData.login}&p=${locData.pass}&q=${rMsg.path}`,
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
            console.log('[DEBUG] Oboe fail:');
            console.log(error);
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
    }
}

function handleLocalRequest(event, pathArg, activeStream) {
    killStream(activeStream);
    let replyMsg = ph.pathToJson(pathArg);
    replyMsg["isLocal"] = true;
    replyMsg["alias"] = "";
    event.sender.send('response', replyMsg);
    event.sender.send('endOfStream');
}

module.exports = {
    handleRemoteRequest,
    handleLocalRequest
};
