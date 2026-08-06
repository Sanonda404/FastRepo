ADD_COLLABORATOR = """
    INSERT INTO repository_collaborators (repository_id, user_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (repository_id, user_id)
    DO UPDATE SET role = EXCLUDED.role
    RETURNING id, repository_id, user_id, role
"""

REMOVE_COLLABORATOR = """
    DELETE FROM repository_collaborators
    WHERE repository_id = $1 AND user_id = $2
    RETURNING user_id
"""
