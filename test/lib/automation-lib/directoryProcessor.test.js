var expect = require('chai').expect;
var path = require('path');

var processor = require('../../../lib/automation-lib/directoryProcessor');

function abs(relativePath) {
    return path.join(__dirname, relativePath);
}

describe('directoryProcessor', function() {

    describe('findRunnable()', function() {

        it('should return a top level directory if it is runnable', function(done) {
            processor.findRunnableDirectories(abs('./test-directorystructure/runnableDir.A-X'), function(err, result) {
                expect(err).to.not.be.ok;
                expect(result.length).to.equal(1);
                expect(result[0]).to.equal(abs('./test-directorystructure/runnableDir.A-X'));
                done();
            });
        });

        it('should not return a non-runnable top level directory', function(done) {
            processor.findRunnableDirectories(abs('./test-directorystructure/non-runnable-dir'), function(err, result) {
                expect(err).to.not.be.ok;
                expect(result.length).to.equal(0);
                done();
            });
        });

        it('Process the children of a non-runnable directory', function(done) {
            processor.findRunnableDirectories(abs('./test-directorystructure/mixed'), function(err, result) {
                expect(err).to.not.be.ok;
                expect(result.length).to.equal(1);
                expect(result[0]).to.equal(abs('./test-directorystructure/mixed/runnable-subdir.A-X'));
                done();
            });
        })
    });

    describe('findFilesRecursive()', function() {

        it('findFilesRecursive', function(done) {
            var path = abs('./test-directorystructure/mixed/runnable-subdir.A-X');
            processor.findFilesRecursive(path, '.txt', function(err, results) {
                var x =1;
                done();
            });

        });
    });

});
