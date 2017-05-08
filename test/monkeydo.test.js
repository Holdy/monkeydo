var expect = require('chai').expect;

var parser = require('../lib/parser');
var executor = require('../lib/executor');

describe('monkeydo', function() {

    describe('processor.processLines', function() {

        it ('should return an error if we call start without configuring.', function(done) {

            var dataPacket = {actions:[]};

            parser.processLines([
                'call start.'
            ], dataPacket);

            executor.execute(dataPacket, function(err) {
                expect(err).to.be.ok;
                expect(err.action.line).to.equal(1);
                expect(err.message).to.equal('The Url, apiKey and kmId are all required.');
                done();
            });
        });

        it ('should error if we expect an error and there is none.', function(done) {

            var dataPacket = {actions:[]};

            parser.processLines([
                'use the api key hufflepuff.',
                'expect error.'
            ], dataPacket);

            var errors = dataPacket.errors;
            if (!errors) {
                errors = [];
            }
            expect(errors.length).to.equal(0);

            executor.execute(dataPacket, function(err) {
                expect(err).to.be.ok;
                expect(err.action.line).to.equal(2);
                expect(err.action.command).to.equal('expectError');
                expect(err.message).to.equal('The expected error did not occur.');
                done();
            });
        });

        it ('should not return an error if we expect it.', function(done) {
            var dataPacket = {actions:[]};

            parser.processLines([
                'call start.',
                'expect error.'
            ], dataPacket);

            var errors = dataPacket.errors;
            if (!errors) {
                errors = [];
            }
            expect(errors.length).to.equal(0);

            executor.execute(dataPacket, function(err) {
                expect(err).to.not.be.ok;
                done();
            });
        });

        it('should process the basic structures.', function(done) {
            var dataPacket = {actions:[]};

            parser.processLines([
                'uSe environment https://test-api.rainbird.ai.',
                'use knowledge map 427f7d0e-227b-4f6a-aacd-6289a809e609.',
                'get api key from RB_API_KEY.',
                'call start.',
                'inject the following facts:',
                '   bob >> likes >> cheese.'
            ], dataPacket);

            executor.execute(dataPacket, function(err) {
                expect(err).to.be.ok;
                expect(err.action.line).to.equal(5);
                expect(err.message.indexOf('Could not find relationship for injection') > 0).to.be.ok;
                done();
            });
        });


        it('should process date injection test (RB-145).', function(done) {
            var dataPacket = {actions:[]};

            parser.processLines([
                'Use the environment https://test-api.rainbird.ai.',
                'Get the api key from RB_145_API_KEY.',
                'Use the kmid 3a986a10-f516-48ff-809e-8806989366d9.',

                'Call start.',

                'Inject the following facts:',
                '   Bob >> hasBirthdate >> 179798400000.',

                'query:',
                '   Bob >> hasBirthdate >> ?.',

                'expect results:',
                '   Bob >> hasBirthdate >> 13th September, 1975.'

            ], dataPacket);

            if (dataPacket.error && dataPacket.error.length != 0) {
                expect(dataPacket.error.length).to.equal(0);
            }

            expect(dataPacket.actions.length).to.equal(7);

            executor.execute(dataPacket, function(err) {
                expect(err).to.not.be.ok;
                done();
            });
        });


        it('should complain if an inject line has no full stop.', function(done) {
            var dataPacket = {actions:[]};

            parser.processLines([
                'inject the following facts:',
                '   bob >> likes >> cheese'
            ], dataPacket);

            expect(dataPacket.errors.length).to.equal(1);
            expect(dataPacket.errors[0].message).to.equal('All lines are expected to end with ? or . or : line: 2');
            done();
        });

    });

});
