import asyncpg

REPOSITORIES_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS repositories (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    parent_repository_id INT REFERENCES repositories(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_owner_repo_name UNIQUE (owner_id, name)
)
"""

async def ensure_repositories_table(pool: asyncpg.Pool) -> None:
    await pool.execute(REPOSITORIES_TABLE_DDL)
