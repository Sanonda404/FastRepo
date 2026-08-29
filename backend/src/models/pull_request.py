import asyncpg

PULL_REQUESTS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS pull_requests (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    state VARCHAR(20) NOT NULL DEFAULT 'open'
        CONSTRAINT pull_requests_state_chk CHECK (state IN ('open', 'closed')),
    source_branch VARCHAR(255) NOT NULL,
    target_branch VARCHAR(255) NOT NULL,
    source_repository_id INT REFERENCES repositories(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP
)
"""

PULL_REQUESTS_INDEX_DDL = """
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo ON pull_requests(repository_id)
"""

async def ensure_pull_requests_table(pool: asyncpg.Pool) -> None:
    await pool.execute(PULL_REQUESTS_TABLE_DDL)
    await pool.execute(PULL_REQUESTS_INDEX_DDL)
