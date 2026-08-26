ADD_COLLABORATOR = """
    INSERT INTO repository_collaborators (repository_id, user_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (repository_id, user_id)
    DO UPDATE SET role = EXCLUDED.role
    RETURNING id, repository_id, user_id, role
"""

GET_ALL_COLLABORATORS = """
    SELECT c.id, c.repository_id, c.user_id, c.role,
        u.username as username, u.email as email
    FROM repository_collaborators c
    INNER JOIN users u ON c.user_id = u.id
    WHERE c.repository_id = $1
"""

GET_COLLABORATOR_BY_ID = """
    SELECT id, repository_id, user_id, role,
    FROM repository_collaborators
    WHERE repository_id = $1 AND user_id = $2
"""


REMOVE_COLLABORATOR = """
    DELETE FROM repository_collaborators
    WHERE repository_id = $1 AND user_id = $2
    RETURNING id, repository_id, user_id, role,
        (SELECT username FROM users u WHERE u.id = repository_collaborators.user_id) as username,
        (SELECT email FROM users u WHERE u.id = repository_collaborators.user_id) as email
"""
