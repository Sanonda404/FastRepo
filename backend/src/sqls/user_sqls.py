#register new user to user's table
REGISTER_USER = """
    INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, email;
    """
    
# get user's information by username
GET_USER_BY_USERNAME = """
        SELECT id, username, email, password_hash, profile_pic_id
        FROM users 
        WHERE username = $1;
    """

#get user's information by email or username
GET_USER_BY_EMAIL_OR_USERNAME = """
        SELECT id, username, email, profile_pic_id
        FROM users
        WHERE email = $1 OR username = $1;
"""

# get user's information by id
GET_USER_BY_ID = """
        SELECT id, username, email, password_hash, profile_pic_id
        FROM users 
        WHERE id = $1;
    """

# update user's information
UPDATE_USER = """
    UPDATE users
    SET email = COALESCE($2, email),
        password_hash = COALESCE($3, password_hash)
    WHERE id = $1
    RETURNING id, username, email;
"""

# profile picture handling
INSERT_PROFILE_PIC = """
    INSERT INTO profile_pics (content, mime_type)
    VALUES ($1, $2)
    RETURNING id;
"""

UPDATE_USER_PROFILE_PIC = """
    UPDATE users
    SET profile_pic_id = $2
    WHERE id = $1
    RETURNING id;
"""

GET_PROFILE_PIC_BY_USER_ID = """
    SELECT p.content, p.mime_type
    FROM profile_pics p
    JOIN users u ON u.profile_pic_id = p.id
    WHERE u.id = $1;
"""

GET_PROFILE_PIC_BY_USERNAME = """
    SELECT p.content, p.mime_type
    FROM profile_pics p
    JOIN users u ON u.profile_pic_id = p.id
    WHERE u.username = $1;
"""

GET_USER_PROFILE_PIC_ID = """
    SELECT profile_pic_id FROM users WHERE id = $1;
"""

DELETE_PROFILE_PIC = """
    DELETE FROM profile_pics WHERE id = $1;
"""

# delete user
DELETE_USER = """
    DELETE FROM users
    WHERE id = $1
    RETURNING id;
"""

# stats for /users/me
GET_USER_STATS = """
WITH accessible_repos AS (
    SELECT id FROM repositories WHERE owner_id = $1
    UNION
    SELECT repository_id AS id FROM repository_collaborators WHERE user_id = $1
)
SELECT
    (SELECT COUNT(*) FROM commits c WHERE c.author_name = $2 AND c.repo_id IN (SELECT id FROM accessible_repos)) AS commits,
    (SELECT COUNT(*) FROM issues WHERE repository_id IN (SELECT id FROM accessible_repos) AND state = 'open') AS open_issues,
    (SELECT COUNT(*) FROM pull_requests WHERE repository_id IN (SELECT id FROM accessible_repos) AND state = 'open') AS open_pull_requests,
    (SELECT COUNT(*) FROM repository_collaborators WHERE repository_id IN (SELECT id FROM accessible_repos)) AS collaborators,
    (SELECT COUNT(*) FROM stars WHERE repository_id IN (SELECT id FROM accessible_repos)) AS stars
"""
