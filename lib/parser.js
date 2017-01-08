"use strict";

var Action = require('./Action');
var Matcher = require('./Matcher');

function checkLineEndIsValid(cleanLine, lineIndex, dataPacket) {
    var lastChar = cleanLine[cleanLine.length-1];
    if (lastChar != '?' && lastChar != ':' && lastChar != '.') {
        addError(dataPacket, 'All lines are expected to end with ? or . or :', lineIndex);
    }
}

function createVariableSettingAction(key, value) {
    var action = new Action();
    action.command = 'setVariable';
    action.data = {'key':key, 'value':value};
    return action;
}


function setCurrentBlockAction(dataPacket, value) {
    dataPacket.currentBlockAction = value;
}

function getCurrentBlockAction(dataPacket) {
    return dataPacket.currentBlockAction;
}

function processBlockEnd(dataPacket) {
    setCurrentBlockAction(dataPacket, null);
}

function processIndentedLine_injection(cleanLine, lineIndex, dataPacket) {
    // 3 or 4 parts (if it has certainty).

    var currentBlockAction = getCurrentBlockAction(dataPacket);

    var action = new Action();
    action.command = 'rainbirdInject';
    cleanLine = cleanLine.substring(0, cleanLine.length-1);
    var items = cleanLine.split(' ');
    if (items.length > 2) {
        action.data = {
            'subject': items[0],
            'relationship': items[1],
            'object': items[2]
        };

        if (items.length === 4) {
            action.data.certainty = Number(items[3].replace('%',''));
        }

        currentBlockAction.data.push(action);
    } else {
        addError(dataPacket, 'Wrong number of items for injection: ' + cleanLine, lineIndex);
    }
}

function processIndentedLine(cleanLine, lineIndex, dataPacket) {
    var blockAction = dataPacket.currentBlockAction;
    if (blockAction) {
        if (blockAction.command === 'callYolandaInject') {
            processIndentedLine_injection(cleanLine, lineIndex, dataPacket);
        } else {
            throw new Error('Not implemented.');
        }

    } else {
        // todo error got indented line but no active block.
    }
}

function processLine(cleanLine, lineIndex, lineWasIndented, dataPacket) {
    checkLineEndIsValid(cleanLine, lineIndex, dataPacket);

    if (!lineWasIndented) {
        processBlockEnd(dataPacket);
    }

    var matcher = new Matcher(cleanLine);
    if (lineWasIndented) {
        processIndentedLine(cleanLine, lineIndex, dataPacket);
    }
    else if (matcher.matches('use environment *.', 'use the environment *.', 'use endpoint *.', 'point at *.')) {
        addAction(dataPacket, createVariableSettingAction('endpointUri', matcher.bindings[0]), lineIndex, cleanLine);
    } else if (matcher.matches('use knowledge map *.', 'use the knowledge map *.') || matcher.matches('use kmid *.')) {
        addAction(dataPacket, createVariableSettingAction('kmid', matcher.bindings[0]), lineIndex, cleanLine);
    } else if (matcher.matches('use api key *.', 'use the api key *.')) {
        addAction(dataPacket, createVariableSettingAction('apiKey', matcher.bindings[0]), lineIndex, cleanLine);
    } else if (matcher.matches('expect error.', 'expect an error.')) {
        var action = new Action();
        action.command = 'expectError';
        addAction(dataPacket, action, lineIndex, cleanLine);
    } else if (matcher.matches('use api key from *.', 'use api key from environment variable *.',
        'get the api key from *.', 'get api key from *.', 'get api key from environment variable *.')) {
        var action = new Action();
        action.command = 'setVariableFromEnvironment';
        action.data = {key:'apiKey', environmentVariable: matcher.bindings[0]};
        addAction(dataPacket, action, lineIndex, cleanLine);
    } else if (matcher.matches('start a new session.', 'start a session.', 'call start.')) {
        var action = new Action();
        action.command = 'callYolandaStart';
        addAction(dataPacket, action, lineIndex, cleanLine);
    } else if (matcher.matches('inject these values:', 'inject the values:', 'inject the following facts:', 'inject these facts:', 'inject this fact:', 'inject:')) {
        var blockAction = new Action();
        blockAction.line = lineIndex + 1;
        blockAction.source = cleanLine;
        blockAction.command = 'callYolandaInject';
        blockAction.data = [];
        setCurrentBlockAction(dataPacket, blockAction);
        addAction(dataPacket, blockAction);
    } else if (matcher.matches('expect this result:','expect these results:','expect result:','expect results:')) {
    } else if (matcher.matches(
            'use the following answer when necessary:',
            'use the following answers when necessary:',
            'use the following answer if necessary:',
            'use the following answers if necessary:',
            'give the following answer when necessary:',
            'give the following answers when necessary:',
            'give the following answer as necessary:',
            'give the following answers as necessary:',
            'answer when asked:', 'when asked, answer:')) {
    } else {
        addError(dataPacket, 'Did not understand the line: \'' + cleanLine + '\'', lineIndex);
    }

}

function addAction(dataPacket, action, lineIndex, source) {
    if (!action) {
        var x = 1;
    }
    if (lineIndex || lineIndex === 0) {
        action.line = lineIndex + 1;
    }
    if (source) {
        action.source = source;
    }

    if (!dataPacket.actions) {
        dataPacket.actions = [];
    }
    dataPacket.actions.push(action);
}

function processLines(lineArray, dataPacket) {

    for (var lineIndex = 0; lineIndex < lineArray.length; lineIndex++) {
        var currentLine = lineArray[lineIndex];
        var cleanLine = currentLine.trim().replace('\r', '');

        if (cleanLine && cleanLine != '') {
            var lineWasIndented = cleanLine.length > 0 && currentLine.length >0 && cleanLine[0] != currentLine[0];
                processLine(cleanLine, lineIndex, lineWasIndented, dataPacket);
        } else {
            processBlockEnd(dataPacket); // The blank line may end a block.
        }
    }

    processBlockEnd(dataPacket); // the end of the lines may end a block;
}

function addError(dataPacket, message, lineIndex) {
    var error = new Error(message + ' line: ' + (lineIndex+1));
    if (!dataPacket.errors) {
        dataPacket.errors = [];
    }
    dataPacket.errors.push(error);
}

module.exports.processLines = processLines;
