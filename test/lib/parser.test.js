var parser =  require('../../lib/parser');
var expect = require('chai').expect;

describe('parser.parseTriple()', function() {

    it('should parse well formed triples.', function (done) {
         var result = parser.parseTriple('The cat >> sat >> on the mat');
        expect(result.error).to.not.be.ok;
        expect(result.subject).to.equal('The cat');
        expect(result.relationship).to.equal('sat');
        expect(result.object).to.equal('on the mat');
        done();
    });

    it('should remove peripheral whitespace.', function (done) {
        var result = parser.parseTriple('   The cat      >>     sat     >>    on the mat      ');
        expect(result.error).to.not.be.ok;
        expect(result.subject).to.equal('The cat');
        expect(result.relationship).to.equal('sat');
        expect(result.object).to.equal('on the mat');
        done();
    });

    it('should error if no separator found.', function (done) {
        var result = parser.parseTriple('   The cat      ');
        expect(result.error).to.equal('No >> separator found.');
        done();
    });

    it('should error if only one separator found.', function (done) {
        var result = parser.parseTriple('   The cat  >> sat    ');
        expect(result.error).to.equal('Second >> separator not found.');
        done();
    });

});


