import asyncpg

USERS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    CONSTRAINT users_email_format_chk CHECK (
        email LIKE '%_@_%'
        AND email NOT LIKE '% %'
    )
)
"""

async def ensure_users_table(pool: asyncpg.Pool) -> None:
    await pool.execute(USERS_TABLE_DDL)
