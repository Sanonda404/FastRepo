import asyncpg
from schemas.user import UserCreate
from auth.auth import get_password_hash

async def create_user(pool: asyncpg.Pool, user_in: UserCreate) -> dict:
    hashed_password = get_password_hash(user_in.password)
    
    # id, username, email, password_hash
    query = """
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, email;
    """
    
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                query, user_in.username, user_in.email, hashed_password
            )
            if row is None:
                raise RuntimeError("Failed to insert user")
            return dict(row)
        except asyncpg.UniqueViolationError:
            raise ValueError("Username or email already registered")

async def get_user_by_username(pool: asyncpg.Pool, username: str) -> dict | None:
    query = """
        SELECT id, username, email, password_hash 
        FROM users 
        WHERE username = $1;
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, username)
        return dict(row) if row else None