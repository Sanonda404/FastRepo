import asyncpg

PERMISSIONS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('branch', 'folder')),
    target_identifier TEXT NOT NULL,
    allow_write BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_team_permission UNIQUE (team_id, target_type, target_identifier)
);
"""

PERMISSIONS_INDEXES_DDL = """
CREATE INDEX IF NOT EXISTS idx_perm_team_target ON permissions(team_id, target_type, target_identifier);
CREATE INDEX IF NOT EXISTS idx_perm_team ON permissions(team_id);
"""

async def ensure_permission_table(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(PERMISSIONS_TABLE_DDL)
            await conn.execute(PERMISSIONS_INDEXES_DDL)
