var rainbirdapi = require('yolapi');

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

            var objectValue = fact.object;
            var objectAsNumber = Number(objectValue);
            if (!isNaN(objectAsNumber)) {
                objectValue = objectAsNumber;
            }

            return {
                subject: fact.subject,
                relationship: fact.relationship,
                object: objectValue,
                cf: fact.cf ? fact.cf : 100};
        });
        session.inject(dataToInject, callback);
    });
}

function callYolandaQuery(action, dataset, callback) {
    ensureSessionExistsFor(action, dataset, callback, function() {

        var session = dataset.data[currentSessionKey];

        if (!action.data || action.data.length != 1) {
            return callback(new Error('Triple for query needs to be specified.'));
        }
        var triple = action.data[0].data;


        session.query(triple, function(err, yolandaApiResult) {
            if (err) {
                return callback(err);
            }

            processAutomatedAnswers(action, dataset, yolandaApiResult, callback);
        });

    });
}

function checkResultsAgainstExpected(resultList, actionData) {
    var errors = [];
    if (resultList.length != actionData.length) {
        errors.push('Expected ' + actionData.length + ' results but got ' + resultList.length);
    }

    var max = resultList.length;
    if (actionData.length < max) {
        max = actionData.length;
    }

    for (var i = 0; i < max; i++) {
        var actual = resultList[i];
        var expected = actionData[i].data;
        if (!isMatch(actual, expected)) {
            var err = 'Result ' + (i+1) + ' expected:\n   ' + formatTriple(expected) + '\nbut got:\n   ' + formatTriple(actual);
            errors.push(err);
        }
    }

    return errors;
}


function handleNull(conceptInstanceRef) {
    return conceptInstanceRef || conceptInstanceRef === 0 ? conceptInstanceRef : '?';
}

function formatTriple(triple) {
    var result = handleNull(triple.subject) + ' >> ' + triple.relationship + ' >> ' + handleNull(triple.object);
    if (triple.certainty || triple.certainty === 0) {
        result += ' ' + triple.certainty + '%';
    }
    return result;
}

function isMatch(actual, expected) {
    var match = true;
    if (expected.object !== actual.object) {
        match = false;
    } else if (expected.subject !== actual.subject) {
        match = false;
    } else if (expected.relationship !== actual.relationship) {
        match = false;
    }

    if ((expected.certainty || expected.certainty === 0) && expected.certainty !== actual.certainty) {
        match = false;
    }

    return match;
}

function hasValue(item) {
    return item  || item === 0 || item === false;
}

function getAnswersFor(yolandaApiResult, predefinedAnswerList) {
    var result = [];
    var q = yolandaApiResult.question;
    if (!hasValue(q.object)) {
        result = predefinedAnswerList.filter(function(fact) {
            return q.subject === fact.data.subject && q.relationship === fact.data.relationship;
        });
    } else if (!hasValue(q.subject)) {
        result = predefinedAnswerList.filter(function(fact) {
            return q.object === fact.data.object && q.relationship === fact.data.relationship;
        });
    } else {
        result = predefinedAnswerList.filter(function(fact) {
            return q.subject === fact.data.subject && q.object === fact.data.object && q.relationship === fact.data.relationship;
        });
    }

    return result;
}

function prepareRainbirdAnswer(action) {
    var certainty = action.data.certainty;
    if (!certainty && certainty !== 0) {
        certainty = 100;
    }

    return {
        subject: action.data.subject,
        relationship: action.data.relationship,
        object: action.data.object,
        'certainty': certainty
    };
}

function prepareQuestionTriple(question) {
    var result = {};

    result.subject = hasValue(question.subject) ? question.subject : '?';
    result.relationship = question.relationship;
    result.object = hasValue(question.object) ? question.object : '?';
    return result;

}

function processAutomatedAnswers(action, dataset, yolandaApiResult, callback) {
    var yolandaResponse = yolandaApiResult;

    if (!yolandaApiResult) {
        return callback(new Error('There is no Yolanda response to work with.'));
    }

    if (yolandaApiResult.question) {
        // Try and answer it with our prepared answers.
        var yolandaData = dataset.data.rainbird_yolanda;
        var questionOrder = ensureList(yolandaData,'questionOrder');
        var questionTriple = prepareQuestionTriple(yolandaApiResult.question);
        questionOrder.push(questionTriple);

        if (yolandaData.definedAnswers) {
            var answers = getAnswersFor(yolandaApiResult, yolandaData.definedAnswers);
            if (answers.length > 0) {

                // send answers and recurse.
                var yolandaSession = dataset.data[currentSessionKey];
                var answerPayload = answers.map(prepareRainbirdAnswer);

                yolandaSession.respond({'answers':answerPayload}, function(err, response) {
                   if (err) {
                        return callback(err);
                   } else {
                        return processAutomatedAnswers(action, dataset, response, callback);
                   }
                });

            } else {
                // Had answers but not matched the question.
                callback(null, yolandaApiResult);
            }
        } else {
            callback(null, yolandaApiResult);
        }
    } else {

        callback(null, yolandaApiResult);
    }
}

function defineYolandaAnswers(action, dataset, callback) {
    if (!dataset.data.rainbird_yolanda) {
        dataset.data.rainbird_yolanda = {};
    }

    dataset.data.rainbird_yolanda.definedAnswers = action.data;

    callback();
}

function ensureMap(owner, name) {
    var result = owner[name];
    if (!result) {
        result = {};
        owner[name] = result;
    }

    return result;
}

function ensureList(owner, name) {
    var result = owner[name];
    if (!result) {
        result = [];
        owner[name] = result;
    }

    return result;
}

function defineAllowableQuestionOrder (action, dataset, callback) {
    var rainbird_yolanda = ensureMap(dataset.data, 'rainbird_yolanda');
    var answerOrderList  = ensureList(rainbird_yolanda, 'answer_order_lists');

    answerOrderList.push (action);
    callback();
}



function isMatchingList(actualList, allowedList) {
    var match = true;

    if (actualList.length != allowedList.length) {
        match = false;
    } else {
        for (var i = 0; i < actualList.length; i++) {
            var actual = actualList[i];
            var allowed = allowedList[i].data;

            if (!(actual.subject === allowed.subject && actual.relationship === allowed.relationship && actual.object === allowed.object)) {
                match = false;
                break;
            }
        }
    }

    return match;
}

function findMatchingList(actualList, allowedLists) {
    var result = null;
    for (var i = 0; i < allowedLists.length; i++) {
        if (isMatchingList(actualList, allowedLists[i].data)) {
            result = allowedLists[i];
            break;
        }
    }

    return result;
}

function getQuestionOrderError(dataset) {
    var result = null;
    var yolandaData = dataset.data.rainbird_yolanda;
    if (yolandaData) {
        var questionOrderLists = yolandaData.answer_order_lists;
        if (questionOrderLists) {
            var actualQuestionOrder = yolandaData.questionOrder;
            if (!findMatchingList(actualQuestionOrder, questionOrderLists)) {
                var errorMessage;
                if (questionOrderLists.length === 1) {
                    errorMessage = 'The actual question order did not match the allowed order.';
                } else if (questionOrderLists.length === 2) {
                    errorMessage = 'The actual question order did not match either of the allowed orders.';
                } else {
                    errorMessage = 'The actual question order did not match any of the ' + questionOrderLists.length + ' allowed orders.';
                }

                errorMessage += ' The actual order was: \n';
                actualQuestionOrder.forEach(function(question) {
                    errorMessage += '   ' + formatTriple(question) + '.\n';
                });

                result = errorMessage;
            }

        }
    }

    return result;
}

function expectYolandaResults(action, dataset, callback) {
    if (action.data && action.data.length > 0) {
        if (dataset.__actionResult && dataset.__actionResult.result) {
            var yolandaResponse = dataset.__actionResult.result;
            if (yolandaResponse.result) {
                var resultList = yolandaResponse.result;

                if (resultList.length === 0) {
                    return callback(new Error('The result list was empty, none of the expected results were present.'));
                }

                var errors = checkResultsAgainstExpected(resultList, action.data);
                if (errors.length > 0) {
                    var errorMessage = 'Results were not as expected: ' + errors.length + ' errors found.\n';
                    errors.forEach(function (errorText) {
                        errorMessage += errorText + '\n';
                    });
                    return callback(new Error(errorMessage));
                } else {
                    var questionOrderError = getQuestionOrderError(dataset);
                    if (questionOrderError) {
                        return callback(new Error(questionOrderError));
                    } else {
                        return callback();
                    }
                }
            }
            else if (yolandaResponse && yolandaResponse.question) {
                var formatQuestion = formatTriple(yolandaResponse.question);
                var message = 'No results, a question was asked: ' + formatQuestion;
                var choices = yolandaResponse.question.concepts;
                if (choices && choices.length > 0) {
                    message += '\nAvailable answers:'
                    choices.forEach(function(conceptInstance) {
                        message += '\n   ' + conceptInstance.name;
                    });
                }
                return callback(new Error(message));
            }  else {
                return callback(new Error('The response contained no results, a question may have been asked.')); //TODO
            }
        } else {
            return callback(new Error('There is no response object - check results failed.'));

        }
        var result = yolanda
    } else {
        callback(new Error('Missing facts for: expect results.'));
    }
}

function prepareNewSession (dataset, callback) {
    var uri = dataset.data.endpointUri;
    var kmid = dataset.data.kmid;
    var apiKey = dataset.data.apiKey;

    try {
        var currentSession = new rainbirdapi.session(uri, kmid, apiKey);
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
module.exports.callYolandaQuery = callYolandaQuery;
module.exports.expectYolandaResults = expectYolandaResults;
module.exports.defineYolandaAnswers = defineYolandaAnswers;
module.exports.defineAllowableQuestionOrder = defineAllowableQuestionOrder;
