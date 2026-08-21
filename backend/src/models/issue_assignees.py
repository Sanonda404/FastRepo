import asyncpg

ISSUE_ASSIGNEES_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS issue_assignees (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    assignee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE
    CONSTRAINT issue_assignees_pkey PRIMARY KEY (issue_id, assignee_id)
)
"""

async def ensure_issue_assignees_table(pool: asyncpg.Pool) -> None:
    await pool.execute(ISSUE_ASSIGNEES_TABLE_DDL)
