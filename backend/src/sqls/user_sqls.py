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