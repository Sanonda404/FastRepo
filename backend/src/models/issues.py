import asyncpg

ISSUES_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS issues(
    id SERIAL PRIMARY KEY,
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    state VARCHAR(20) NOT NULL DEFAULT 'open' CONSTRATINT issues_state_chk CHECK (state IN ('open', 'closed')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP NOT NULL DEFAULT NOW(),
);
"""

async def ensure_issues_table(pool: asyncpg.Pool) -> None:
    await pool.execute(ISSUES_TABLE_DDL)


