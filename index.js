var Exporter = require( "./lib/exporter" );
var data = require( "./lib/data" );

exports = module.exports = Exporter;

Object.keys( data ).forEach(function( method ) {
	exports[ method ] = data[ method ];
});
