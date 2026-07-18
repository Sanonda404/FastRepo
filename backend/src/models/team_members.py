import asyncpg

TEAM_MEMBERS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS team_members (
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    collaborator_id INT NOT NULL REFERENCES repository_collaborators(id) ON DELETE CASCADE
)
"""

async def ensure_team_members_table(pool: asyncpg.Pool) -> None:
    await pool.execute(TEAM_MEMBERS_TABLE_DDL)
