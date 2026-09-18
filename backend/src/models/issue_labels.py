import asyncpg

ISSUE_LABELS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS issue_labels (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id INT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    CONSTRAINT issue_labels_pkey PRIMARY KEY (issue_id, label_id)
)
"""

DELETE_ORPHAN_LABEL_FUNC = """
CREATE OR REPLACE FUNCTION delete_orphan_label()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM labels
    WHERE id = OLD.label_id
        AND NOT EXISTS (
            SELECT 1 FROM issue_labels WHERE label_id = OLD.label_id
        );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
"""

DELETE_ORPHAN_LABEL_TRIGGER = """
DROP TRIGGER IF EXISTS delete_orphan_label ON issue_labels;
CREATE TRIGGER delete_orphan_label
AFTER DELETE ON issue_labels
FOR EACH ROW
EXECUTE FUNCTION delete_orphan_label();
"""

async def ensure_issue_labels_table(pool: asyncpg.Pool) -> None:
    await pool.execute(ISSUE_LABELS_TABLE_DDL)
    async with pool.acquire() as conn:
        await conn.execute(DELETE_ORPHAN_LABEL_FUNC)
        await conn.execute(DELETE_ORPHAN_LABEL_TRIGGER)
