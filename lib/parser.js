"use strict";

var Action = require('./Action');
var Matcher = require('./Matcher');

var neutralState = 1;
var injectionBlock = 2;
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

function processBlockEnd(currentState, dataPacket) {
    if (currentState === injectionBlock) {
        var action = new Action();
        action.command = 'callYolandaInject';
        addAction(dataPacket, action);
        currentState = neutralState;
    }

    return currentState;
}

function processLine(cleanLine, lineIndex, lineWasIndented, dataPacket, currentState) {
    checkLineEndIsValid(cleanLine, lineIndex, dataPacket);

    if (!lineWasIndented) {
        currentState = processBlockEnd(currentState, dataPacket);
    }

    var matcher = new Matcher(cleanLine);
    if (matcher.matches('use environment *.', 'use endpoint *.', 'point at *.')) {
        addAction(dataPacket, createVariableSettingAction('endpointUri', matcher.bindings[0]), lineIndex, cleanLine);
    } else if (matcher.matches('use knowledge map *.') || matcher.matches('use kmid *.')) {
        addAction(dataPacket, createVariableSettingAction('kmid', matcher.bindings[0]), lineIndex, cleanLine);
    } else if (matcher.matches('use api key *.')) {
        addAction(dataPacket, createVariableSettingAction('apiKey', matcher.bindings[0]), lineIndex, cleanLine);
    } else if (matcher.matches('use api key from *.', 'use api key from environment variable *.',
        'get api key from *.', 'get api key from environment variable *.')) {
        var action = new Action();
        action.command = 'setVariableFromEnvironment';
        action.data = {key:'apiKey', environmentVariable: matcher.bindings[0]};
        addAction(dataPacket, action, lineIndex, cleanLine);
    } else if (matcher.matches('start a new session.', 'start a session.', 'call start.')) {
        var action = new Action();
        action.command = 'callYolandaStart';
        addAction(dataPacket, action, lineIndex, cleanLine);
    } else if (matcher.matches('inject these values:', 'inject the values:', 'inject these facts:', 'inject this fact:', 'inject:')) {
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
        addError(dataPacket, 'Did not understand the line: ' + cleanLine, lineIndex);
    }
}

function addAction(dataPacket, action, lineIndex, source) {
    action.line = lineIndex + 1;
    action.source = source;

    if (!dataPacket.actions) {
        dataPacket.actions = [];
    }
    dataPacket.actions.push(action);
}
function processLines(lineArray, dataPacket) {

    var state = neutralState;

    for (var lineIndex = 0; lineIndex < lineArray.length; lineIndex++) {
        var currentLine = lineArray[lineIndex];
        var cleanLine = currentLine.trim();

        if (cleanLine && cleanLine != '') {
            var lineWasIndented = cleanLine.length > 0 && currentLine.length >0 && cleanLine[0] != currentLine[0];
                state = processLine(cleanLine, lineIndex, lineWasIndented, dataPacket, state);
        } else {
            state = processBlockEnd(state, dataPacket); // the blank line may end a block.
        }
    }

    processBlockEnd(state, dataPacket); // the end of the lines may end a block;
}


function addError(dataPacket, message, lineIndex) {

}

module.exports.processLines = processLines;
