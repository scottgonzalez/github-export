var querystring = require( "querystring" );
var github = require( "github-request" );

var authToken;

exports._each = each;
exports._recurse = recurse;
exports.simplifyIssue = simplifyIssue;
exports.simplifyComment = simplifyComment;
exports.simplifyEvent = simplifyEvent;
exports.setAuthToken = setAuthToken;
exports.getIssues = getIssues;
exports.getLabels = getLabels;
exports.getMilestones = getMilestones;
exports.getIssueComments = getIssueComments;
exports.getIssueEvents = getIssueEvents;
exports.getIssuesWithData = getIssuesWithData;



// Utilities

function setAuthToken( token ) {
	authToken = token;
}

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

function recurse( path, iterator, callback ) {
	var headers = {};

	if ( authToken ) {
		headers.Authorization = "token " + authToken;
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

			recurse( meta.links.next, iterator, callback );
		});
	});
}



// Data Helpers

function simplifyIssue( issue ) {
	var simplifiedIssue = {
		id: issue.id,
		number: issue.number,
		title: issue.title,
		user: issue.user.login,
		labels: issue.labels,
		state: issue.state,
		locked: issue.locked,
		assignee: issue.assignee,
		milestone: issue.milestone,
		comments: issue.comments,
		created: issue.created_at,
		updated: issue.updated_at,
		closed: issue.closed_at,
		body: issue.body
	};

	if ( issue.actions ) {
		simplifiedIssue.actions = issue.actions.map(function( action ) {
			if ( action.event ) {
				return simplifyEvent( action );
			} else {
				return simplifyComment( action );
			}
		});
	}

	return simplifiedIssue;
}

function simplifyComment( comment ) {
	return {
		id: comment.id,
		user: comment.user.login,
		created: comment.created_at,
		updated: comment.updated_at,
		body: comment.body
	};
}

function simplifyEvent( event ) {
	return {
		id: event.id,
		user: event.actor.login,
		event: event.event,
		commit: event.commit_id,
		created: event.created_at
	};
}



// GitHub Integration

// repo
// ?since
function getIssues( options, iterator, callback ) {
	var query = {
		sort: "updated",
		direction: "asc"
	};

	if ( options.since ) {
		query.since = options.since.toISOString();
	}

	var url = "/repos/" + options.repo + "/issues?" + querystring.stringify( query );

	recurse( url, iterator, callback );
}

// repo
// issue
function getIssueComments( options, iterator, callback ) {
	recurse( "/repos/" + options.repo + "/issues/" + options.issue + "/comments",
		iterator, callback );
}

// repo
// issue
function getIssueEvents( options, iterator, callback ) {
	recurse( "/repos/" + options.repo + "/issues/" + options.issue + "/events",
		iterator, callback );
}

// repo
function getLabels( options, iterator, callback ) {
	recurse( "/repos/" + options.repo + "/labels", iterator, callback );
}

// repo
// ?state
function getMilestones( options, iterator, callback ) {
	var query = {
		sort: "due_date",
		direction: "asc",
		state: options.state || "all"
	};

	var url = "/repos/" + options.repo + "/milestones?" + querystring.stringify( query );

	recurse( url, iterator, callback );
}

// repo
// ?since
function getIssuesWithData( options, iterator, callback ) {
	var repo = options.repo;
	var since = options.since;

	getIssues({
		repo: repo,
		since: since
	}, function( issue, issueDone ) {
		var actions = [];

		getIssueComments({
			repo: repo,
			issue: issue.number
		}, function( comment, commentDone ) {
			actions.push( comment );
			commentDone();
		}, function( error ) {
			if ( error ) {
				return issueDone( error );
			}

			getIssueEvents({
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
		});
	}, callback );
}
