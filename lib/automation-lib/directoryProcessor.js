var fs = require('fs');
var path = require('path');
var async = require('async');

function getAutomationTag(directoryName) {
    var result = null;
    var index = directoryName.indexOf('.A-');
    if (index != -1) {
        result = directoryName.substring(index + 1);
        index = result.indexOf('.');
        if (index != -1) {
            result = result.substring(index);
        }
    }

    return result;
}

function isRunnable(automationTag) {
    return automationTag.indexOf('S') != -1;
}

function extensionIsMatch(file, extension) {
    if (extension) {
        var index = file.toLowerCase().indexOf(extension);
        return  (index != -1 && (index + extension.length) === file.length);
    } else {
        return true; // No extension requirement.
    }
}

function addFilesRecursive(targetDirectory, extension, fileList, callback) {
    fs.readdir(targetDirectory, function(err, files) {
        if (err) {
            return callback(err);
        }

        var fullFileNames = files.map(function(file) {
            return path.join(targetDirectory, file);
        });

        async.each(fullFileNames, function(file, itemCallback) {
            var stats = fs.statSync(file);
            if (stats.isDirectory()) {
                addFilesRecursive(file, extension, fileList, itemCallback);
            } else if (stats.isFile() && extensionIsMatch(file, extension)) {
                fileList.push(file);
                itemCallback();
            } else {
                itemCallback();
            }

        }, callback);
    });
}

function findFilesRecursive(targetDirectory, extension, callback) {
    var fileList = [];
    addFilesRecursive(targetDirectory, extension.toLowerCase(), fileList, function(err) {
        if (err) {
            return callback(err);
        }

        callback(null, fileList);
    });
}

function findRunnableDirectories (targetDirectory, callback) {
    var result = [];
    var tag = getAutomationTag(targetDirectory);

    if (tag && isRunnable(tag)) {
        result.push(targetDirectory);
        callback(null, result);
    } else {
        // Subdirectories
        fs.readdir(targetDirectory, function(err, files) {
            if (err)  {
                return callback(err);
            } else {
                files.map(function(file) {
                    return path.join(targetDirectory, file);
                }).filter(function(file) {
                    if (fs.statSync(file).isDirectory()) {
                        var tag = getAutomationTag(file);
                        return tag && isRunnable(tag);
                    } else {
                        return false;
                    }
                }).forEach(function(runnableDirectory) {
                     result.push(runnableDirectory);
                });
                callback(null, result);
            }
        });

    }

}


module.exports.findRunnableDirectories = findRunnableDirectories;
module.exports.findFilesRecursive = findFilesRecursive;
