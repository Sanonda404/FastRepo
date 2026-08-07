import asyncpg

PR_REVIEWS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS pr_reviews (
    id SERIAL PRIMARY KEY,
    pull_request_id INT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    reviewer_id INT REFERENCES users(id) ON DELETE SET NULL,
    decision TEXT NOT NULL,
    body TEXT,
    reviewed_at TIMESTAMP NOT NULL DEFAULT NOW()
)
"""

async def ensure_pr_reviews_table(pool: asyncpg.Pool) -> None:
    await pool.execute(PR_REVIEWS_TABLE_DDL)
