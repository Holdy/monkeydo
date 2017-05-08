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
    var triple = parseTriple(cleanLine);
    if (!triple.error) {
        action.data = triple;
        currentBlockAction.data.push(action);
    } else {
        addError(dataPacket, triple.error + ': ' + cleanLine, lineIndex);
    }
}

function processIndentedLine_query(cleanLine, lineIndex, dataPacket) {
    // 3 or 4 parts (if it has certainty).
    // TODO could error if more than one triple for query.
    var currentBlockAction = getCurrentBlockAction(dataPacket);

    var action = new Action();
    action.command = 'rainbirdQuery';
    cleanLine = cleanLine.substring(0, cleanLine.length-1);
    var triple = parseTriple(cleanLine);
    if (!triple.error) {
        if (triple.object === '?') {
            triple.object = null;
        }
        if (triple.subject === '?') {
            triple.subject = null;
        }
        action.data = triple;
        currentBlockAction.data.push(action);
    } else {
        addError(dataPacket, triple.error + ': ' + cleanLine, lineIndex);
    }
}

function processIndentedLine_results(cleanLine, lineIndex, dataPacket) {
    // 3 or 4 parts (if it has certainty).
    // TODO could error if more than one triple for query.
    var currentBlockAction = getCurrentBlockAction(dataPacket);

    var action = new Action();
    action.command = 'rainbirdResult';
    cleanLine = cleanLine.substring(0, cleanLine.length-1);
    var triple = parseTriple(cleanLine);
    if (!triple.error) {
        action.data = triple;
        currentBlockAction.data.push(action);
    } else {
        addError(dataPacket, triple.error + ': ' + cleanLine, lineIndex);
    }
}

function processIndentedLine_allowableQuestionOrder (cleanLine, lineIndex, dataPacket) {
    var currentBlockAction = getCurrentBlockAction(dataPacket);

    var action = new Action();
    action.command = 'rainbirdQuestion';
    cleanLine = cleanLine.substring(0, cleanLine.length-1);
    var triple = parseTriple(cleanLine);
    if (!triple.error) {
        action.data = triple;
        currentBlockAction.data.push(action);
    } else {
        addError(dataPacket, triple.error + ': ' + cleanLine, lineIndex);
    }
}

function processIndentedLine_answers(cleanLine, lineIndex, dataPacket) {
    // 3 or 4 parts (if it has certainty).
    // TODO could error if more than one triple for query.
    var currentBlockAction = getCurrentBlockAction(dataPacket);

    var action = new Action();
    action.command = 'rainbirdAnswer';
    cleanLine = cleanLine.substring(0, cleanLine.length-1);
    var triple = parseTriple(cleanLine);
    if (!triple.error) {
        action.data = triple;
        currentBlockAction.data.push(action);
    } else {
        addError(dataPacket, triple.error + ': ' + cleanLine, lineIndex);
    }
}

function processIndentedLine(cleanLine, lineIndex, dataPacket) {
    var blockAction = dataPacket.currentBlockAction;
    if (blockAction) {
        if (blockAction.command === 'callYolandaInject') {
            processIndentedLine_injection(cleanLine, lineIndex, dataPacket);
        } else if (blockAction.command === 'callYolandaQuery') {
            processIndentedLine_query(cleanLine, lineIndex, dataPacket);
        } else if (blockAction.command === 'expectYolandaResults') {
            processIndentedLine_results(cleanLine, lineIndex, dataPacket);
        } else if (blockAction.command === 'defineYolandaAnswers') {
            processIndentedLine_answers(cleanLine, lineIndex, dataPacket);
        } else if (blockAction.command === 'allowableYolandaQuestionOrder') {
            processIndentedLine_allowableQuestionOrder(cleanLine, lineIndex, dataPacket);
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
    } else if (matcher.matches('use knowledge map *.', 'use the knowledge map *.') || matcher.matches('use kmid *.') || matcher.matches('use the kmid *.')) {
        addAction(dataPacket, createVariableSettingAction('kmid', matcher.bindings[0]), lineIndex, cleanLine);
    } else if (matcher.matches('use api key *.', 'use the api key *.')) {
        addAction(dataPacket, createVariableSettingAction('apiKey', matcher.bindings[0]), lineIndex, cleanLine);
    } else if (matcher.matches('expect error.', 'expect an error.')) {
        var action = new Action();
        action.command = 'expectError';
        addAction(dataPacket, action, lineIndex, cleanLine);
    } else if (matcher.matches('get the api key from *.', 'get api key from *.','read the api key from *.', 'read api key from *.', 'get api key from environment variable *.')) {
        var action = new Action();
        action.command = 'setVariableFromEnvironment';
        action.data = {key:'apiKey', environmentVariable: matcher.bindings[0]};
        addAction(dataPacket, action, lineIndex, cleanLine);
    } else if (matcher.matches('start a new session.', 'start a session.', 'call start.', 'Call start.')) {
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

    } else if (matcher.matches('query:')) {
        var blockAction = new Action();
        blockAction.line = lineIndex + 1;
        blockAction.source = cleanLine;
        blockAction.command = 'callYolandaQuery';
        blockAction.data = [];
        setCurrentBlockAction(dataPacket, blockAction);
        addAction(dataPacket, blockAction);

    } else if (matcher.matches ('query bridge: *, national language, ?.')) {
        var action = new Action();
        action.command = 'bridgeQuery-nationalLanguage';

        action.data = {'target': matcher.bindings[0].trim()};
        addAction(dataPacket, action, lineIndex, cleanLine);
    } else if (matcher.matches('bridge load instances *.')) { // demo

    } else if (matcher.matches('query the semantic web: <http://dbped*.')) {
        var action = new Action();
        action.command = 'querySemanticWeb';
        addAction(dataPacket, action, lineIndex, cleanLine);
    } else if (matcher.matches('query the semantic web: <http://some*.')) {
        var action = new Action();
        action.command = 'querySemanticWebEnvoy';
        addAction(dataPacket, action, lineIndex, cleanLine);
    } else if (matcher.matches('expect this result:','expect these results:','expect result:','expect results:')) {
        var blockAction = new Action();
        blockAction.line = lineIndex + 1;
        blockAction.source = cleanLine;
        blockAction.command = 'expectYolandaResults';
        blockAction.data = [];
        setCurrentBlockAction(dataPacket, blockAction);
        addAction(dataPacket, blockAction);
    } else if (matcher.matches(
            'use the following answer when necessary:',
            'use the following answers when necessary:',
            'use the following answer if necessary:',
            'use the following answers if necessary:',
            'use answers when necessary:',
            'give the following answer when necessary:',
            'give the following answers when necessary:',
            'give the following answer as necessary:',
            'give the following answers as necessary:',
            'answer when asked:', 'when asked, answer:')) {
        var blockAction = new Action();
        blockAction.line = lineIndex + 1;
        blockAction.source = cleanLine;
        blockAction.command = 'defineYolandaAnswers';
        blockAction.data = [];
        setCurrentBlockAction(dataPacket, blockAction);
        addAction(dataPacket, blockAction);
    } else if (matcher.matches('accept question order:', 'allow question order:', 'allowable question order:', 'valid question order:')) {
        var blockAction = new Action();
        blockAction.line = lineIndex + 1;
        blockAction.source = cleanLine;
        blockAction.command = 'allowableYolandaQuestionOrder';
        blockAction.data = [];
        setCurrentBlockAction(dataPacket, blockAction);
        addAction(dataPacket, blockAction);
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

function buildTriple(result, parts, certaintyNumber) {
    result.subject = parts[0];
    result.relationship = parts[1];
    result.object = parts[2];

    if (certaintyNumber !== null) {
        result.certainty = certaintyNumber;
    }
}

function parseTriple(line) {
    var result = {};
    var cleanLine = line.trim();
    var parts = [];
    var index = cleanLine.indexOf('>>');

    if (index === -1) {
        result.error = 'No >> separator found.';
    } else {
        parts.push(cleanLine.substring(0,index).trim());
        cleanLine = cleanLine.substring(index + 2);
        index = cleanLine.indexOf('>>');

        if (index === -1) {
            result.error = 'Second >> separator not found.';
        } else {
            parts.push(cleanLine.substring(0, index).trim());
            cleanLine = cleanLine.substring(index + 2).trim();

            var certaintyNumber = null;
            if (cleanLine.length > 0 && cleanLine[cleanLine.length-1] == '%') {
                // certainty is present.
                var certaintyIndex = cleanLine.lastIndexOf(' ');
                if (certaintyIndex != -1) {
                    var certaintyDefinition = cleanLine.substring(0, cleanLine.length-1).substring(certaintyIndex).trim();
                    cleanLine = cleanLine.substring(0, certaintyIndex ).trim();
                    certaintyNumber = Number(certaintyDefinition);
                }
            }



            if (cleanLine !== '') {
                parts.push(cleanLine.trim());
                buildTriple(result, parts, certaintyNumber);
            } else {
                result.error = 'Nothing after the second >>.';
            }

        }
    }
    return result;
}

module.exports.processLines = processLines;
module.exports.parseTriple = parseTriple;
