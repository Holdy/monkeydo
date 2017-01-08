var rainbirdProcessor = require('./processors/rainbirdProcessor');

var expectedErrorCallback = null;

function setLogExpectedErrorCallback(value) {
    expectedErrorCallback = value;
}

function logExpectedError(text) {
    if (expectedErrorCallback) {
        expectedErrorCallback(text);
    }
}

function prepareExternalError(preambleText, errorObject, action) {
    errorObject.action = action;
    errorObject.preamble = preambleText;
    return errorObject;
}

function failurePreamble(action) {
    return quoted(action.source) + ' at line ' + action.line +
        ' failed.';
}

function executeImpl(dataset, dataPacket, actionIndex, callback) {
    var mostRecentError = dataset.__mostRecentError;

    if (actionIndex < dataPacket.actions.length) {
        var action = dataPacket.actions[actionIndex];

        if (mostRecentError && !mostRecentError.preceededAction)
        {
            // this error has just occurred.
            mostRecentError.preceededAction = action;
            // The next action needs to be expecting this error.
            if (!mostRecentError.expected) {
                if (action.command !== 'expectError') {
                    callback(prepareExternalError(failurePreamble(mostRecentError.action), mostRecentError.error, mostRecentError.action));
                } else {
                    logExpectedError('Error expected by line ' + action.line + ' occured: ' + mostRecentError.error.message);
                }
            }
        }

        // TODO unit test to check if we end with errors.

        var handlerFunction = actionHandlers[action.command];

        if (handlerFunction) {
            handlerFunction(action, dataset, function(err) {

                if (err) {
                    // We store the error for now - the user needs to 'expect' it
                    // in the next action, otherwise the error will stop the script.
                    var errorWrapper = {
                        action: action,
                        error: err,
                        expected: false
                    };
                    dataset.__mostRecentError = errorWrapper;

                }

                executeImpl(dataset, dataPacket, ++actionIndex, callback); // Process the next action.
            });
        } else {
            var err = new Error('Did not know how to handle the command ' +  quoted(action.command) +
            ' at line: ' + action.line);
            callback(prepareExternalError(failurePreamble(action), err, action));
        }

    } else {
        if (mostRecentError && !mostRecentError.expected) {
            // The last action in the script caused this error.
            // As the script is finished, there's no chance of this
            // error being expected so we pass the error to the callback.
            callback(prepareExternalError(failurePreamble(mostRecentError.action), mostRecentError.error, mostRecentError.action));

        } else {
            callback(); // Exit condition - No more actions so we are finished without error.
        }
    }
}

function execute(dataPacket, callback) {

    if (!dataPacket.actions) {
        callback();
    } else {
        executeImpl({data:{}}, dataPacket, 0, callback);
    }
}

function quoted(text) {
    return '\'' + text + '\'';
}

var actionHandlers = {

    setVariableFromEnvironment: function(action, dataset, callback) {
        var value = process.env[action.data.environmentVariable];
        if (!value && value !== 0) {
            callback(new Error('The environment variable ' + quoted(action.data.environmentVariable) + ' was not found.'));
        } else {
            dataset.data[action.data.key] = value;
            callback();
        }
    },

    setVariable: function(action, dataset, callback) {
        dataset.data[action.data.key] = action.data.value;
        callback();
    },

    expectError: function(action, dataset, callback) {
        var mostRecentError = dataset.__mostRecentError;

        if (!mostRecentError || mostRecentError.preceededAction !== action) {
            var error = new Error('The expected error did not occur.');
            callback(error);
        } else {
            // the mostRecentError is the error for this action.
            // TODO - if there are sub - checks, perform them.
            mostRecentError.expected = true;
            callback();
        }
    },
    callYolandaStart: function(action, dataset, callback) {
        rainbirdProcessor.callYolandaStart(action,dataset, callback);
    },

    callYolandaInject: function(action, dataset, callback) {
        rainbirdProcessor.callYolandaInject(action, dataset, callback);
    },

    callYolandaQuery: function(action, dataset, callback) {
        rainbirdProcesor.callYolandaQuery(action, dataset, callback);
    }


};

module.exports.execute = execute;
module.exports.setLogExpectedErrorCallback = setLogExpectedErrorCallback;

