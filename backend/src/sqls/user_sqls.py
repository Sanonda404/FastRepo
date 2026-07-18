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

# get user's information by id
GET_USER_BY_ID = """
        SELECT id, username, email, password_hash 
        FROM users 
        WHERE id = $1;
    """