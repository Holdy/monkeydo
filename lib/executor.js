
function executeImpl(dataset, dataPacket, actionIndex, callback) {
    if (actionIndex < dataPacket.actions.length) {
        var action = dataPacket.actions[actionIndex];
        var handlerFunction = actionHandlers[action.command];

        if (handlerFunction) {
            handlerFunction(action, dataset, function(err) {
                if (err) {
                    callback(new Error('Error occurred processing \'' + action.source + '\' line:' + action.line + '. ' + err.message));
                } else {
                    executeImpl(dataset, dataPacket, ++actionIndex, callback); // Process the next action.
                }
            });
        } else {
            callback(new Error('Did not know how to handle the command \'' +  action.command + '\''));
        }

    } else {
        callback(); // Exit condition - No more actions so we are finished without error.
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

    prepareNewSession: function (dataset, callback) {

    },

    setVariableFromEnvironment: function(action, dataset, callback) {
        var value = process.env[action.environmentVariable];
        if (!value && value !== 0) {
            callback(new Error('The environment variable ' + quoted(action.data.environmentVariable) + ' was not found.'));
        } else {
            dataset.data[action.key] = value;
            callback();
        }
    },

    setVariable: function(action, dataset, callback) {
        dataset.data[action.data.key] = action.data.value;
        callback();
    },

    callYolandaStart: function(action, dataset, callback) {
        this.prepareNewSession(dataset, callback);
    },

    ensureSessionExistsFor: function(action, dataset, errorCallback, successCallback) {
        if (!dataset.data['__RBSession']) {
            this.prepareNewSession(dataset, function(err) {
                if (err) {
                    errorCallback(new Error('Tried to create a new session before ' + action.source + ' but failed: ' + err.message));
                } else {
                    successCallback();
                }
            });
        } else {
            successCallback();
        }
    },

    callYolandaInject: function(action, dataset, callback) {
        ensureSessionExistsFor(action, dataset, callback, function() {
            // do inject call
        });
    },

    callYolandaQuery: function(action, dataset, callback) {
        ensureSessionExistsFor(action, dataset, callback, function() {
            // do query call
        });
    }


};




module.exports.execute = execute;


