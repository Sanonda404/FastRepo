import asyncpg

PERMISSIONS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('branch', 'folder')),
    target_identifier TEXT NOT NULL,
    allow_write BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_team_permission UNIQUE (repository_id, team_id, target_type, target_identifier)
);
"""

async def ensure_permission_table(pool: asyncpg.Pool) -> None:
    await pool.execute(PERMISSIONS_TABLE_DDL)
