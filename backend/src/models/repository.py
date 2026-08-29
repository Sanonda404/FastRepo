import asyncpg

REPOSITORIES_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS repositories (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    default_branch VARCHAR(255) NOT NULL DEFAULT 'main',
    parent_repository_id INT REFERENCES repositories(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_owner_repo_name UNIQUE (owner_id, name)
)"""

REPOSITORIES_INDEX_DDL = """
CREATE INDEX IF NOT EXISTS idx_repos_parent_id ON repositories(parent_repository_id)
"""

async def ensure_repositories_table(pool: asyncpg.Pool) -> None:
    await pool.execute(REPOSITORIES_TABLE_DDL)
    await pool.execute(REPOSITORIES_INDEX_DDL)
