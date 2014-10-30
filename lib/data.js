exports.simplifyIssue = simplifyIssue;
exports.simplifyComment = simplifyComment;
exports.simplifyEvent = simplifyEvent;

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
