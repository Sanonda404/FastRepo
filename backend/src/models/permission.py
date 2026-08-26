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

CHECK_TEAM_IS_FROM_SAME_REPO_FUNCTION = """
    CREATE OR REPLACE FUNCTION validate_team_is_from_same_repo()
    RETURNS TRIGGER AS $$
    DECLARE
        v_repository_id INT;
    BEGIN
        -- Fetch the repository_id of the target team
        SELECT repository_id INTO v_repository_id
        FROM teams
        WHERE id = NEW.team_id;

        -- If team doesn't exist or belongs to a different repository
        IF v_repository_id IS DISTINCT FROM NEW.repository_id THEN
            RAISE EXCEPTION 'Constraint Violation: Team % does not belong to repository %.', NEW.team_id, NEW.repository_id;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
"""

CHECK_TEAM_IS_FROM_SAME_REPO_TRIGGER = """
    DROP TRIGGER IF EXISTS validate_team_is_from_same_repo ON permissions;

    CREATE TRIGGER validate_team_is_from_same_repo
    BEFORE INSERT OR UPDATE OF team_id, repository_id
    ON permissions
    FOR EACH ROW
    EXECUTE FUNCTION validate_team_is_from_same_repo();
"""

async def ensure_permission_table(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(PERMISSIONS_TABLE_DDL)
            await conn.execute(CHECK_TEAM_IS_FROM_SAME_REPO_FUNCTION)
            await conn.execute(CHECK_TEAM_IS_FROM_SAME_REPO_TRIGGER)