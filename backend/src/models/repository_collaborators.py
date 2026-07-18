import asyncpg

REPOSITORY_COLLABORATORS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS repository_collaborators (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(255) NOT NULL,
    CONSTRAINT unique_repo_collaborator UNIQUE (repository_id, user_id)
);
"""

async def ensure_repository_collaborators_table(pool: asyncpg.Pool) -> None:
    await pool.execute(REPOSITORY_COLLABORATORS_TABLE_DDL)
