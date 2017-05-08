#!/usr/bin/env node
"strict on";
var colors = require('colors');

var path = require('path');
var fs = require('fs');

var parser = require('./lib/parser');
var executor = require('./lib/executor');

var arguments = process.argv;

executor.setLogExpectedErrorCallback(function(text) {

    console.log(colors.magenta(text));
    console.log('');

});

console.log('');

if (arguments.length == 2) {
    console.log('Please specify the script to run as the first argument.');
    console.log('For example: monkeydo myScriptFile.txt');
    console.log('');
    process.exit(1);
}

var fileName = arguments[2];
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

function runFilesLoop(fileNameList, index, collectedErrors, callback) {
    if (index < fileNameList) {
        var fileName = fileNameList[index];
        runFile(fileName, function(err) {

        });
    } else {
        callback(); // Completed list without internal error.
    }
}

function runSetOfFiles(fileNameList, callback) {

    var collectedErrors = [];

    runFilesLoop(fileNameList, 0, collectedErrors, function (err) {
        if (err) {
            console.log('Error running file set: ' + err);
            return callback(err);
        }

        var fileCount = fileNameList.length;
        var errorCount = collectedErrors.length;
        if (collectedErrors.length === 0) {
            console.log(colors.green('Success: ' + fileCount + '/' + fileCount));
            callback();
        } else {
            console.log(colors.red('Success: ' + (fileCount - errorCount) + '/' + fileCount));
            console.log(colors.red('Failed : ' + errorCount));
            callback('Failed ' + errorCount + '/' + fileCount);
        }
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
        callback(message);
    }

    executor.execute(runnableScript, function(err) {
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

