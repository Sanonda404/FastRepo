#register new user to user's table
REGISTER_USER = """
    INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, email;
    """
    
# get user's information by username
GET_USER_BY_USERNAME = """
        SELECT id, username, email, password_hash 
        FROM users 
        WHERE username = $1;
    """

#get user's information by email or username
GET_USER_BY_EMAIL_OR_USERNAME = """
        SELECT id, username, email
        FROM users
        WHERE email = $1 OR username = $1;
"""

# get user's information by id
GET_USER_BY_ID = """
        SELECT id, username, email, password_hash 
        FROM users 
        WHERE id = $1;
    """

# update user's information
UPDATE_USER = """
    UPDATE users
    SET username = COALESCE($2, username),
        email = COALESCE($3, email),
        password_hash = COALESCE($4, password_hash)
    WHERE id = $1
    RETURNING id, username, email;
"""

# delete user
DELETE_USER = """
    DELETE FROM users
    WHERE id = $1
    RETURNING id;
"""

# stats for /users/me
GET_USER_STATS = """
SELECT
    (SELECT COUNT(*) FROM commits WHERE author_name = $2) AS commits,
    (SELECT COUNT(*) FROM issues WHERE repository_id IN (SELECT id FROM repositories WHERE owner_id = $1) AND state = 'open') AS open_issues,
    (SELECT COUNT(*) FROM pull_requests WHERE repository_id IN (SELECT id FROM repositories WHERE owner_id = $1) AND state = 'open') AS open_pull_requests,
    (SELECT COUNT(*) FROM repository_collaborators WHERE repository_id IN (SELECT id FROM repositories WHERE owner_id = $1)) AS collaborators,
    (SELECT COUNT(*) FROM stars WHERE repository_id IN (SELECT id FROM repositories WHERE owner_id = $1)) AS stars
"""