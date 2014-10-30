exports.each = each;

function each( items, iterator, callback ) {
	if ( !items.length ) {
		return callback( null );
	}

	iterator( items.shift(), function( error ) {
		if ( error ) {
			return callback( error );
		}

		each( items, iterator, callback );
	});
}
