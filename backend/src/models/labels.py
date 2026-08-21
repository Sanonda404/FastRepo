import asyncpg


LABELS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6b7280'
        CHECK (color ~* '^#[0-9a-f]{6}$'),
    CONSTRAINT unique_label_name UNIQUE (name)
)
"""

async def ensure_labels_table(pool: asyncpg.Pool) -> None:
    await pool.execute(LABELS_TABLE_DDL)
