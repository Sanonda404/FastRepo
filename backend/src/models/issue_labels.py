import asyncpg

ISSUE_LABELS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS issue_assignees (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id INT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    CONSTRAINT issue_assignees_pkey PRIMARY KEY (issue_id, assignee_id)
)
"""

async def ensure_issue_labels_table(pool: asyncpg.Pool) -> None:
    await pool.execute(ISSUE_LABELS_TABLE_DDL)
