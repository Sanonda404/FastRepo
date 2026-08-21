import asyncpg

ISSUE_PULL_REQUESTS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS issue_pull_requests (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    pull_request_id INT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    CONSTRAINT issue_pull_requests_pkey PRIMARY KEY (issue_id, pull_request_id)
)
"""


async def ensure_issue_pull_requests_table(pool: asyncpg.Pool) -> None:
    await pool.execute(ISSUE_PULL_REQUESTS_TABLE_DDL)
