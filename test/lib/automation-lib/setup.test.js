var expect = require('chai').expect;
var path = require('path');

var setup = require('../../../lib/automation-lib/setup');
var ActionList = require('../../../lib/automation-lib/actionList');

function abs(relativePath) {
    return path.join(__dirname, relativePath);
}

describe('setup', function() {


    it('should add runnable directories', function(done) {
        var actionList = ActionList.create();
        setup.addRunnableDirectories(abs('./test-directorystructure/mixed'), actionList, function(err) {
            if (err) {
                throw err;
            }
            var x  =1;

            done();
        });
    });




});
