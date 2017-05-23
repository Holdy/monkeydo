var directoryProcessor = require('./directoryProcessor');
var async = require('async');


function addRunnableDirectories(directoryTarget, actionList, callback) {

    directoryProcessor.findRunnableDirectories(directoryTarget, function(err, runnableDirectoryList) {
        if (err) {
            return callback(err);
        }

        async.each(runnableDirectoryList, function(directoryPath, itemCallback) {

            var name = nameFromDirectory(directoryPath);
            var action = {
                'verb': 'run',
                'name': name,
                'type': 'executable directory',
                'directory': directoryPath
            };

            directoryProcessor.findFilesRecursive(directoryPath, '.txt', function(err, fileList) {
                if (err) {
                    action.error = 'Error setting up items.';
                } else {
                    action.itemCount = fileList.length;
                }

                actionList.add(action);
                itemCallback();
            });


        }, callback);

    });

}

function nameFromDirectory (directoryPath) {
    var result = directoryPath;
    var index = directoryPath.lastIndexOf('/');
    if (index != -1) {
        result = directoryPath.substring(index + 1);
        index = result.indexOf('.A-');
        if (index != -1) {
            var candidate = result.substring(0, index);
            if (candidate != '') {
                result = candidate;
            }
        }
    }
    return result;
}

module.exports.addRunnableDirectories = addRunnableDirectories;
