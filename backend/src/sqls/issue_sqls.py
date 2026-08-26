CREATE_ISSUE = """
    INSERT INTO issues(repository_id, author_id, title, body, number)
    VALUES (
        $1, $2, $3, $4,
        COALESCE(
            (SELECT max(number) + 1 FROM issues WHERE repository_id = $1),
            1
        )
    )
    RETURNING id, title, body, state, number, created_at, closed_at
"""

GET_ALL_ISSUES = """
    SELECT i.id, u.username as author_username, u2.username as closed_by_username,
    i.title, i.body, i.state, i.number, i.created_at, i.closed_at,
    (SELECT count(*) FROM issue_comments WHERE issue_id = i.id) as comments_count,
    (SELECT count(*) FROM issue_pull_requests WHERE issue_id = i.id) as pull_requests_count,
    COALESCE(
        (SELECT ARRAY_AGG(ROW(l.id, l.name, l.color))
        FROM issue_labels il
        INNER JOIN labels l ON il.label_id = l.id
        WHERE il.issue_id = i.id), '{}'
    ) AS labels,
    COALESCE(
        (SELECT ARRAY_AGG(u3.username)
        FROM issue_assignees ia
        INNER JOIN users u3 ON ia.user_id = u3.id
        WHERE ia.issue_id = i.id), '{}'
    ) AS assignees
    FROM issues i
    INNER JOIN users u
    ON i.author_id = u.id
    LEFT OUTER JOIN users u2
    ON i.closed_by_id = u2.id
    WHERE repository_id = $1
"""

GET_ISSUE_BY_NUMBER = """
    SELECT i.id, u.username as author_username, u2.username as closed_by_username,
    i.title, i.body, i.state, i.number, i.created_at, i.closed_at
    FROM issues i
    INNER JOIN users u
    ON i.author_id = u.id
    LEFT OUTER JOIN users u2
    ON i.closed_by_id = u2.id
    WHERE repository_id = $1 AND number = $2
"""


CLOSE_ISSUE_BY_REPO_ID_AND_NUMBER = """
    UPDATE issues
    SET closed_by_id = $1, closed_at = NOW(), state = 'closed'
    WHERE repository_id = $2 AND number = $3
    RETURNING id, title, body, state, number, created_at, closed_at,
    (SELECT username FROM users u
    WHERE u.id = issues.author_id) as author_username
"""

DELETE_ISSUE_BY_REPO_ID_AND_NUMBER = """
    DELETE FROM issues
    WHERE repository_id = $1 AND number = $2
    RETURNING id, repository_id, title, body, state, number, created_at, closed_at,
        (SELECT username FROM users u WHERE u.id = issues.author_id) as author_username,
        (SELECT username FROM users u WHERE u.id = issues.closed_by_id) as closed_by_username
"""

GET_ISSUE_REPOSITORY = """
    SELECT r.id, r.name, r.owner_id, r.is_private
    FROM issues i
    INNER JOIN repositories r ON i.repository_id = r.id
    WHERE i.id = $1
"""
