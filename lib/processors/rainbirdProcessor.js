var RainbirdSession = require('./RainbirdSession');

var currentSessionKey = '__RAINBIRD_CURRENT_SESSION';
var lastRainbirdResponseKey = '__RAINBIRD_RESPONSE';

function callYolandaStart(action, dataset, callback) {
    prepareNewSession(dataset, callback);
}

function callYolandaInject(action, dataset, callback) {
    ensureSessionExistsFor(action, dataset, callback, function() {

        var session = dataset.data[currentSessionKey];
        var dataToInject = action.data.map(function(injectAction) {
            var fact = injectAction.data;
            return {
                subject: fact.subject,
                relationship: fact.relationship,
                object: fact.object,
                cf: fact.cf ? fact.cf : 100};
        });
        session.inject(dataToInject, callback);
    });
}

function prepareNewSession (dataset, callback) {
    var uri = dataset.data.endpointUri;
    var kmid = dataset.data.kmid;
    var apiKey = dataset.data.apiKey;

    try {
        var currentSession = new RainbirdSession(uri, kmid, apiKey);
    } catch (err) {
        return callback(err);
    }
    dataset.data[currentSessionKey] = currentSession;
    currentSession.start(callback);
}

function ensureSessionExistsFor (action, dataset, errorCallback, successCallback) {
    if (!dataset.data[currentSessionKey]) {
        prepareNewSession(dataset, function(err) {
            if (err) {
                errorCallback(new Error('Tried to create a new session before ' + action.source + ' but failed: ' + err.message));
            } else {
                successCallback();
            }
        });
    } else {
        successCallback();
    }
}


module.exports.callYolandaStart = callYolandaStart;
module.exports.callYolandaInject = callYolandaInject;
