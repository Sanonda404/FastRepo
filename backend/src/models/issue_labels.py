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

VALIDATE_UNIQUE_LABEL_NAME_PER_ISSUE_FUNC = """
CREATE OR REPLACE FUNCTION validate_unique_label_name_per_issue()
RETURNS TRIGGER AS $$
DECLARE
    v_new_name VARCHAR(50);
BEGIN
    SELECT name INTO v_new_name FROM labels WHERE id = NEW.label_id;

    IF v_new_name IS NULL THEN
        RAISE EXCEPTION 'Constraint Violation: Label % not found', NEW.label_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM issue_labels il
        INNER JOIN labels l ON l.id = il.label_id
        WHERE il.issue_id = NEW.issue_id
            AND l.name = v_new_name
            AND il.label_id IS DISTINCT FROM NEW.label_id
    ) THEN
        RAISE EXCEPTION 'Constraint Violation: Issue % already has a label named %', NEW.issue_id, v_new_name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

VALIDATE_UNIQUE_LABEL_NAME_PER_ISSUE_TRIGGER = """
DROP TRIGGER IF EXISTS validate_unique_label_name_per_issue ON issue_labels;
CREATE TRIGGER validate_unique_label_name_per_issue
BEFORE INSERT OR UPDATE OF issue_id, label_id
ON issue_labels
FOR EACH ROW
EXECUTE FUNCTION validate_unique_label_name_per_issue();
"""

async def ensure_issue_labels_table(pool: asyncpg.Pool) -> None:
    await pool.execute(ISSUE_LABELS_TABLE_DDL)
    async with pool.acquire() as conn:
        await conn.execute(DELETE_ORPHAN_LABEL_FUNC)
        await conn.execute(DELETE_ORPHAN_LABEL_TRIGGER)
        await conn.execute(VALIDATE_UNIQUE_LABEL_NAME_PER_ISSUE_FUNC)
        await conn.execute(VALIDATE_UNIQUE_LABEL_NAME_PER_ISSUE_TRIGGER)
