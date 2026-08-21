import asyncpg

ISSUE_LABELS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS issue_labels (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id INT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    CONSTRAINT issue_labels_pkey PRIMARY KEY (issue_id, label_id)
)
"""

async def ensure_issue_labels_table(pool: asyncpg.Pool) -> None:
    await pool.execute(ISSUE_LABELS_TABLE_DDL)
