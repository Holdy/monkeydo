#!/usr/bin/env node
"strict on";
var colors = require('colors');

var path = require('path');
var fs = require('fs');

var directoryProcessor = require('./lib/automation-lib/directoryProcessor');
var parser = require('./lib/parser');
var executor = require('./lib/executor');
var server = require('./lib/automation-lib/server');
var arguments = process.argv;

executor.setLogExpectedErrorCallback(function(text) {

    console.log(colors.magenta(text));
    console.log('');

});

if (arguments[1].indexOf('monkeydo') != -1) {

    console.log('');

    if (arguments.length == 2) {
        console.log('Please specify the script to run as the first argument.');
        console.log('For example: monkeydo myScriptFile.txt');
        console.log('');
        process.exit(1);
    }

    var fileName = arguments[2];

    if (fileName === 'server') {
        server.startServer({port:8889});
    } else if (fileName === 'all') {
        var directory = process.cwd();
        console.log('Running all files (recursively) under: ' + directory);
        runAllFilesUnder(directory);
    } else {
        runAsFile(fileName);
    }
}


function runAsFile (fileName) {
    var fullFileName;

    if (fileName && fileName.length > 0 && fileName[0] === '/') {
        fullFileName = fileName;
    } else {
        fullFileName = path.join(process.cwd(), fileName);
    }

    if (fs.existsSync(fullFileName)) {
        console.log('Running ' + fullFileName);
        runFile(fullFileName, function(err) {
            console.log('');
            if (err) {
                process.exit(1);
            }
        });
    } else {
        console.log(colors.red('There is no such file: ' + fullFileName));
        console.log('');
        process.exit(1);
    }
}

function errorAndExit(err) {
    console.log(colors.red(err));
    console.log('');
    process.exit(1);
}

function runAllFilesUnder(directoryName) {
    directoryProcessor.findFilesRecursive(directoryName, '.txt', function(err, files) {
        if (err) {
            return errorAndExit(err);
        } else if (files.length === 0) {
            return errorAndExit('No .txt files found.');
        }

        console.log('Found ' + files.length + (files.length === 1 ? ' file.' : ' files.'));
        var filesetContext = makeFileSetContext();
        runSetOfFiles(files, filesetContext, function(err, filesetContext) {
           if (err) {
               return errorAndExit(err);
           }

           var errorCount = filesetContext.errors.length;
            if (errorCount > 0) {
                return errorAndExit('Failed with ' + errorCount + ' errors.');
            }
        });

    });
}


function makeFileSetContext() {
    return {
        errors: [],
        total_tasks: 0,
        processed_tasks: 0,
        failed_tasks: 0,
        successful_tasks: 0
    };
}

//TODO - errors give full paths to files - should probably be relative to somewhere - or
// even just the file name.

function runFilesLoop(fileNameList, index, filesetContext, callback) {
    var totalTasks = fileNameList.length;
    if (index < totalTasks) {
        var fileName = fileNameList[index];
        console.log('Running (' + (index+1) + '/' + totalTasks + '): ' + fileName);
        var fileCallbackCount = 0;
        runFile(fileName, function(err) {
            if (++fileCallbackCount > 1) {
                console.log('runFilesLoop Callback called more than once.');
            }
            filesetContext.processed_tasks++;
            if (err) {
                filesetContext.failed_tasks++;
                var wrappedError = {
                    file: fileName,
                    error: err
                };
                filesetContext.errors.push(wrappedError);
            } else {
                filesetContext.successful_tasks++;
            }
            runFilesLoop(fileNameList, ++index, filesetContext, callback);
        });
    } else {
        callback(); // Completed list without internal error.
    }
}

function runSetOfFiles(fileNameList, filesetContext, callback) {

    filesetContext.total_tasks = fileNameList.length;
    var callbackCount = 0;

    runFilesLoop(fileNameList, 0, filesetContext, function (err) {
        if (++callbackCount > 1) {
            return callback('Callback called more than once.');
        }
        if (err) {
            console.log('Error running file set: ' + err);
            return callback(err);
        }

        var failedTasks = filesetContext.failed_tasks;
        var totalTasks = filesetContext.total_tasks;
        if (filesetContext.errors.length === 0) {
            console.log(colors.green('Success: ' + totalTasks + '/' + totalTasks));
        } else {
            console.log(colors.red('Failed : ' + failedTasks + '/' + totalTasks));
        }
        callback(null, filesetContext);
    });
}


function runFile(fullFileName, callback) {
    var lines = fs.readFileSync(fullFileName).toString().split("\n");

    var runnableScript = {actions: []};
    parser.processLines(lines, runnableScript);

    if (runnableScript.errors && runnableScript.errors.length > 0) {
        var message ='The file ' + fullFileName + ' could not be loaded successfully';
        console.log( message + ':');
        runnableScript.errors.forEach(function(error) {
           console.log(colors.red(error));
        });
        return callback(message);
    }

    var callbackCount = 0;
    executor.execute(runnableScript, function(err) {
        if (++callbackCount > 1) {
            return console.log('ERROR - runFile callback called more than once - suppressing.');
        }
        if (err) {
            if (err.preamble) {
                console.log(err.preamble);
            }
            console.log(colors.red(err.message));
            callback(err);
        } else {
            console.log(colors.green('Success.'));
            callback();
        }
    });

}

module.exports.makeFileSetContext = makeFileSetContext;
module.exports.runSetOfFiles = runSetOfFiles;
module.exports.startServer = server.startServer;
