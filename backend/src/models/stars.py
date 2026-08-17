import asyncpg

STARS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS stars (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    repository_id INT REFERENCES repositories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, repository_id)
);
"""

async def ensure_stars_table(pool: asyncpg.Pool) -> None:
    await pool.execute(STARS_TABLE_DDL)
