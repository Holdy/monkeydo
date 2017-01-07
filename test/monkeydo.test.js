var expect = require('chai').expect;

var parser = require('../lib/parser');
var executor = require('../lib/executor');

describe('monkeydo', function() {

    describe('processor.processLines', function() {

        it('should process the basic structures.', function(done) {
            var dataPacket = {actions:[]};

            parser.processLines([
                'uSe environment http://staging.rainbird.ai.',
                'use knowledge map abc-123.',
                'get api key from RB_API_KEY.',
                'call start.'
            ], dataPacket);

            executor.execute(dataPacket, function(err) {
                done(err);
            });

        });
    });


});
