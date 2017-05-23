var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var app = express();
var setup = require('./setup');
var guid = require('node-uuid');

var directoryProcessor = require('./directoryProcessor');
var monkeydo = require('../../monkeydo');

app.disable('x-powered-by');
var server = http.createServer(app);

app.use(bodyParser.urlencoded({'extended': false}));
app.use(bodyParser.json());

var actionList = require('./actionList').create();
var statusMap = {};

function sendData(res, data) {
    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({'data': data}, null, 3));
}

function sendError(res, data, httpStatusCode) {
    if (!httpStatusCode) {
        httpStatusCode = 200;
    }
    res.status(httpStatusCode);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({'error': data}, null, 3));
}

function processDisco (req, res) {
    sendData(res, actionList.displayList);
}

function getValidAction(verb, targetName) {
    var result = null;
    var cleanName = targetName.trim();
    actionList.list.forEach(function(action) {
        if (action.name === cleanName && action.verb === verb) {
            result = action;
        }
    });

    return result;
}

function processDo(req, res) {
    var verb = req.params.verb;
    var target = req.params.target;

    var action = getValidAction(verb, target);

    if (!action) {
        sendError(res, {
            message: 'Could not find an item with a matching name and verb.',
            'verb': verb,
            'name': target
        }); // TODO should perhaps be a not found.
    } else {
        var filesetContext = monkeydo.makeFileSetContext();
        var id = guid.v4();
        filesetContext.statusLink = '/status/' + id;
        statusMap[id] = filesetContext;

        directoryProcessor.findFilesRecursive(action.directory, '.txt', function (err, fileList) {
            if (err) {
                return sendError(res, err);
            }

            sendData(res, filesetContext);

            monkeydo.runSetOfFiles(fileList, filesetContext, function (err) {
                // Not really bothered about errors, although we should mark the
                // run as completed.
                // TODO
            });

        });

    }
}

function processStatus(req, res) {
    var key = req.params.key;
    var statusObject = statusMap[key];

    if (statusObject) {
        sendData(res, statusObject);
    } else {
        var error = {
            'message': 'The key is invalid or the status object is no longer available',
            'key': key
        };
        sendError(res, error);
    }
}

app.get('/disco', processDisco);
app.get('/do/:verb/:target', processDo);
app.get('/status/:key', processStatus);

function startServer(data, callback) {

    var portNumber = data.port;

    setup.addRunnableDirectories(data.directory, actionList, function(err) {
        if (err) {
            console.log(err);
            if (callback) callback(err);
            return;
        }

        server.listen(portNumber, function() {
            console.log('Listening on :' + portNumber);

            var result = {
                'stop': function(callback) {
                    server.close(callback);
                }
            };

            if (callback) {
                callback(null, result);
            }
        });
    });
}

module.exports.startServer = startServer;
