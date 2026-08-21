import asyncpg

PROFILE_PICS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS profile_pics (
    id SERIAL PRIMARY KEY,
    content BYTEA NOT NULL,
    mime_type VARCHAR(100) NOT NULL
);
"""

async def ensure_profile_picss_table(pool: asyncpg.Pool) -> None:
    await pool.execute(PROFILE_PICS_TABLE_DDL)
