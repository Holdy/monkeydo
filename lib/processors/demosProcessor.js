var KGjs = require('/Users/chrisholden/Development/arctest/KnowledgeGraphJS/KGjs');

var dbpediaPopulator =  require('/Users/chrisholden/Development/arctest/KnowledgeGraphJS/lib/accessors/dbpediaPopulator');
var wikidataPopulator =  require('/Users/chrisholden/Development/arctest/KnowledgeGraphJS/lib/accessors/wikidataPopulator');

var graph = KGjs.newGraph();
var sameAs = graph.ensureResource('http://www.w3.org/2002/07/owl#sameAs');

function bridgeQueryLanguage(action, dataset, callback) {

    console.log('query bridge: ' + action.data.target + ', national language, ?');

    var lib = require('/Users/chrisholden/Development/arctest/rdf-bridge/rdfBridge');
    var bridge = lib.create(KGjs.newGraph(KGjs.allAccessors))
    bridge.defaultSetup(function(err) {
        if (err){
            console.log('err' + err);
        }

        bridge.list(action.data.target, 'national language', null, function(err, results) {

console.log(            JSON.stringify(results, null, 3));

            callback();

        });

    });

}

function querySemanticWebEnvoy(callback) {
    console.log(

        'querying: <http://some.org/units/rainbirdUnit> <http://business.org/visitbook/visit> ?'
    );
    require('/Users/chrisholden/Development/arctest/EnvoyExample/envoyExample');
}

function querySemanticWeb(callback) {

    console.log('querying: <http://dbpedia.org/resource/Norwich> <http://www.wikidata.org/property/P190> ?');


    var dbpedia_Norwich = graph.ensureResource('http://dbpedia.org/resource/Norwich');

    var tripleProcessor = require('/Users/chrisholden/Development/arctest/KnowledgeGraphJS/lib/tripleProcessor').newTripleProcessor(graph);

    dbpediaPopulator.populate(dbpedia_Norwich, tripleProcessor, function(err) {

        // We should now know that the dbPedia url is the same as the wikidata uri
        graph.list(dbpedia_Norwich, sameAs, function(err, wrappedResults) {

            var wikidata_Norwich = wrappedResults[0].value;
            wikidataPopulator.populate(wikidata_Norwich, tripleProcessor, function(err) {

                var sisterCityResource =  graph.ensureResource('http://www.wikidata.org/property/P190');
                graph.list(wikidata_Norwich, sisterCityResource, function(err, wrappedResults) {

                    console.log(JSON.stringify(wrappedResults,null,3));

                    callback();
                });
            });
        });
    });
}


module.exports.querySemanticWeb = querySemanticWeb;

module.exports.querySemanticWebEnvoy = querySemanticWebEnvoy;
module.exports.bridgeQueryLanguage = bridgeQueryLanguage;
