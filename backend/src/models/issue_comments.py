import asyncpg

ISSUE_COMMENTS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS issue_comments (
    id SERIAL PRIMARY KEY,
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
)
"""

async def ensure_issues_comments_table(pool: asyncpg.Pool) -> None:
    await pool.execute(ISSUE_COMMENTS_TABLE_DDL)
