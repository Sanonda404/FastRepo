CREATE_ISSUE_COMMENT = """
    INSERT INTO issue_comments (issue_id, author_id, body)
    VALUES ($1, $2, $3)
    RETURNING id, issue_id, body, created_at
"""

GET_ALL_COMMENTS_BY_ISSUE_ID = """
    SELECT i.id, i.issue_id, u.username as author_username, i.body, i.created_at
    FROM issue_comments i
    INNER JOIN users u
    on i.author_id = u.id
    WHERE issue_id = $1
"""

GET_ISSUE_COMMENT_BY_ID = """
    SELECT i.id, i.issue_id, u.username as author_username, i.body, i.created_at
    FROM issue_comments i
    INNER JOIN users u
    on i.author_id = u.id
    WHERE i.id = $1
"""


DELETE_ISSUE_COMMENT_BY_ID = """
    DELETE FROM issue_comments i
    WHERE i.id = $1
    RETURNING i.id
"""

