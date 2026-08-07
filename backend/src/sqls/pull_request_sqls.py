CREATE_PULL_REQUEST = """
    INSERT INTO pull_requests (repository_id, author_id, body, source_branch, target_branch, source_repository_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, repository_id, author_id, body, state, source_branch, target_branch,
              source_repository_id, created_at, closed_at
"""

PULL_REQUEST_SELECT = """
    SELECT pr.id, pr.repository_id, pr.author_id, pr.body, pr.state,
           pr.source_branch, pr.target_branch, pr.source_repository_id,
           pr.created_at, pr.closed_at, u.username AS author_username
    FROM pull_requests pr
    LEFT JOIN users u ON pr.author_id = u.id
"""

GET_ALL_PULL_REQUESTS = PULL_REQUEST_SELECT + """
    WHERE pr.repository_id = $1
    ORDER BY pr.id
"""

GET_PULL_REQUEST_BY_ID = PULL_REQUEST_SELECT + """
    WHERE pr.repository_id = $1 AND pr.id = $2
"""

UPDATE_PULL_REQUEST = """
    UPDATE pull_requests
    SET body = COALESCE($3, body),
        state = COALESCE($4, state),
        closed_at = CASE
            WHEN $4 = 'closed' THEN COALESCE(closed_at, NOW())
            WHEN $4 = 'open' THEN NULL
            ELSE closed_at
        END
    WHERE id = $1 AND repository_id = $2
    RETURNING id, repository_id, author_id, body, state, source_branch, target_branch,
              source_repository_id, created_at, closed_at,
              (SELECT username FROM users u WHERE u.id = pull_requests.author_id) AS author_username
"""

DELETE_PULL_REQUEST = """
    DELETE FROM pull_requests
    WHERE id = $1 AND repository_id = $2
    RETURNING id
"""

CLOSE_PULL_REQUEST = """
    UPDATE pull_requests
    SET state = 'closed', closed_at = NOW()
    WHERE id = $1
    RETURNING id, repository_id, author_id, body, state, source_branch, target_branch,
              source_repository_id, created_at, closed_at,
              (SELECT username FROM users u WHERE u.id = pull_requests.author_id) AS author_username
"""

GET_BRANCH_REF = """
    SELECT value FROM refs
    WHERE repo_id = $1 AND name = $2
"""

GET_REPO_BY_ID = """
    SELECT id, owner_id, name, description, is_private, default_branch, parent_repository_id, created_at
    FROM repositories WHERE id = $1
"""

GET_USERNAME_SQL = """
    SELECT username FROM users WHERE id = $1
"""

ADD_COLLABORATOR_IF_MISSING = """
    INSERT INTO repository_collaborators (repository_id, user_id, role)
    VALUES ($1, $2, 'write')
    ON CONFLICT (repository_id, user_id) DO NOTHING
"""

CREATE_PR_REVIEW = """
    INSERT INTO pr_reviews (pull_request_id, reviewer_id, decision, body)
    VALUES ($1, $2, $3, $4)
    RETURNING id, pull_request_id, reviewer_id, decision, body, reviewed_at
"""

PR_REVIEW_SELECT = """
    SELECT r.id, r.pull_request_id, r.reviewer_id, r.decision, r.body, r.reviewed_at,
           u.username AS reviewer_username
    FROM pr_reviews r
    LEFT JOIN users u ON r.reviewer_id = u.id
"""

GET_PR_REVIEWS = PR_REVIEW_SELECT + """
    WHERE r.pull_request_id = $1
    ORDER BY r.id
"""

GET_PR_REVIEW = PR_REVIEW_SELECT + """
    WHERE r.pull_request_id = $1 AND r.id = $2
"""

UPDATE_PR_REVIEW = """
    UPDATE pr_reviews
    SET decision = COALESCE($3, decision),
        body = COALESCE($4, body)
    WHERE id = $1 AND pull_request_id = $2
    RETURNING id, pull_request_id, reviewer_id, decision, body, reviewed_at,
              (SELECT username FROM users u WHERE u.id = pr_reviews.reviewer_id) AS reviewer_username
"""

DELETE_PR_REVIEW = """
    DELETE FROM pr_reviews
    WHERE id = $1 AND pull_request_id = $2
    RETURNING id
"""

GET_COMMIT_FOR_COPY = """
    SELECT content, root_tree_sha, author_name, author_date, message
    FROM commits WHERE repo_id = $1 AND sha = $2
"""

GET_BLOB_CONTENT = """
    SELECT content FROM blobs WHERE repo_id = $1 AND sha = $2
"""
