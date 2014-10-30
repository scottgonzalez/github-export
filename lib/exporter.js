var querystring = require( "querystring" );
var github = require( "github-request" );
var each = require( "./util" ).each;

exports = module.exports = Exporter;

function Exporter( options ) {
	if ( !options.repo ) {
		throw new Error( "Missing required option `repo`." );
	}

	if ( !/^.+\/.+$/.test( options.repo ) ) {
		throw new Error( "Invalid value for `repo`. Must be user/repo." );
	}

	this.repo = options.repo;
	this.authToken = options.hasOwnProperty( "authToken" ) ?
		options.authToken :
		null;
}

Exporter.prototype.recurse = function( path, iterator, callback ) {
	var headers = {};

	if ( this.authToken ) {
		headers.Authorization = "token " + this.authToken;
	}

	github.request({
		path: path,
		headers: headers
	}, function( error, data, meta ) {
		if ( error ) {
			return callback( error );
		}

		each( data, iterator, function( error ) {
			if ( error ) {
				return callback( error );
			}

			if ( !meta.links || !meta.links.next ) {
				return callback( null );
			}

			this.recurse( meta.links.next, iterator, callback );
		}.bind( this ));
	}.bind( this ));
};

// ?since
Exporter.prototype.getIssues = function( options, iterator, callback ) {
	var query = {
		sort: "updated",
		direction: "asc"
	};

	if ( options.since ) {
		query.since = options.since.toISOString();
	}

	var url = "/repos/" + this.repo + "/issues?" + querystring.stringify( query );

	this.recurse( url, iterator, callback );
};

// issue
Exporter.prototype.getIssueComments = function( options, iterator, callback ) {
	this.recurse( "/repos/" + this.repo + "/issues/" + options.issue + "/comments",
		iterator, callback );
};

// issue
Exporter.prototype.getIssueEvents = function( options, iterator, callback ) {
	this.recurse( "/repos/" + this.repo + "/issues/" + options.issue + "/events",
		iterator, callback );
};

Exporter.prototype.getLabels = function( options, iterator, callback ) {
	this.recurse( "/repos/" + this.repo + "/labels", iterator, callback );
};

// ?state
Exporter.prototype.getMilestones = function( options, iterator, callback ) {
	var query = {
		sort: "due_date",
		direction: "asc",
		state: options.state || "all"
	};

	var url = "/repos/" + this.repo + "/milestones?" + querystring.stringify( query );

	this.recurse( url, iterator, callback );
};

// ?since
Exporter.prototype.getIssuesWithData = function( options, iterator, callback ) {
	var repo = this.repo;
	var since = options.since;

	this.getIssues({
		repo: repo,
		since: since
	}, function( issue, issueDone ) {
		var actions = [];

		this.getIssueComments({
			repo: repo,
			issue: issue.number
		}, function( comment, commentDone ) {
			actions.push( comment );
			commentDone();
		}, function( error ) {
			if ( error ) {
				return issueDone( error );
			}

			this.getIssueEvents({
				repo: repo,
				issue: issue.number
			}, function( event, eventDone ) {
				actions.push( event );
				eventDone();
			}, function( error ) {
				if ( error ) {
					return issueDone( error );
				}

				issue.actions = actions.sort(function( a, b ) {
					return new Date( a.created_at ) - new Date( b.created_at );
				});

				iterator( issue, issueDone );
			});
		}.bind( this ));
	}.bind( this ), callback );
};
