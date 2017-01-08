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
var fullFileName = path.join(process.cwd(), fileName);

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
    process.exit(1);
}

function runFile(fullFileName, callback) {
    var lines = fs.readFileSync(fullFileName).toString().split("\n");

    var runnableScript = {actions: []};
    parser.processLines(lines, runnableScript);

    if (runnableScript.errors && runnableScript.errors.length > 0) {
        console.log('The file ' + fullFileName + ' could not be loaded successfully:');
        runnableScript.errors.forEach(function(error) {
           console.log(colors.red(error));

        });
        callback(1);
    }

    executor.execute(runnableScript, function(err) {
        if (err) {
            if (err.preamble) {
                console.log(err.preamble);
            }
            console.log(colors.red(err.message));
            callback(1);
        } else {
            console.log(colors.green('Success.'));
            callback();
        }
    });

}

