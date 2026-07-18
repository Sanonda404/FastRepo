import asyncpg

TEAMS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    parent_team_id INT REFERENCES teams(id) ON DELETE CASCADE,

    CONSTRAINT unique_team_name UNIQUE(repository_id, name)
)
"""

async def ensure_teams_table(pool: asyncpg.Pool) -> None:
    await pool.execute(TEAMS_TABLE_DDL)
