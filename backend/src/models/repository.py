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
## Add default_branch col
CREATE_DEFAULT_BRANCH_COL = """
    ALTER TABLE repositories
    ADD COLUMN IF NOT EXISTS
    default_branch VARCHAR(255) NOT NULL DEFAULT 'main';
    ALTER TABLE repositories
    ALTER COLUMN default_branch SET DEFAULT 'main'
"""

CREATE_DESCRIPTION_COL = """
    ALTER TABLE repositories
    ADD COLUMN IF NOT EXISTS description TEXT
"""

## Update the previous repositories default branches
UPDATE_DEAFULT_BRANCH = """
    UPDATE repositories
    SET default_branch = 'main'
    WHERE default_branch IS NULL OR default_branch = '' OR default_branch <> 'main'
"""

async def ensure_repositories_table(pool: asyncpg.Pool) -> None:
    await pool.execute(REPOSITORIES_TABLE_DDL)
    await pool.execute(CREATE_DEFAULT_BRANCH_COL)
    await pool.execute(CREATE_DESCRIPTION_COL)
    await pool.execute(UPDATE_DEAFULT_BRANCH)
