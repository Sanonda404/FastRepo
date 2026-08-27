import asyncpg

TEAM_MEMBERS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS team_members (
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES repository_collaborators(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, member_id)
);
"""

TEAM_MEMBERS_INDEX_DDL = """
CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON team_members(member_id)
"""

CHECK_TEAM_COLLABORATOR_FROM_SAME_REPO_FUNCTION = """
    CREATE OR REPLACE FUNCTION validate_team_collaborator_from_same_repo()
    RETURNS TRIGGER AS $$
    DECLARE
        v1_repository_id INT;
        v2_repository_id INT;
    BEGIN
        -- Fetch the repository_id of the target team
        SELECT repository_id INTO v1_repository_id
        FROM teams
        WHERE id = NEW.team_id;
        
        -- Fetch the repository_id of the target collaborator
        SELECT repository_id INTO v2_repository_id
        FROM repository_collaborators
        WHERE id = NEW.member_id;

        -- If team doesn't exist or belongs to a different repository
        IF v1_repository_id IS DISTINCT FROM v2_repository_id THEN
            RAISE EXCEPTION 'Constraint Violation: Team and collaborator are not part of same repository';
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
"""

CHECK_TEAM_COLLABORATOR_FROM_SAME_REPO_TRIGGER = """
    DROP TRIGGER IF EXISTS validate_team_collaborator_from_same_repo ON team_members;

    CREATE TRIGGER validate_team_collaborator_from_same_repo
    BEFORE INSERT OR UPDATE OF team_id, member_id
    ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION validate_team_collaborator_from_same_repo();
"""

async def ensure_team_members_table(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(TEAM_MEMBERS_TABLE_DDL)
            await conn.execute(TEAM_MEMBERS_INDEX_DDL)
            await conn.execute(CHECK_TEAM_COLLABORATOR_FROM_SAME_REPO_FUNCTION)
            await conn.execute(CHECK_TEAM_COLLABORATOR_FROM_SAME_REPO_TRIGGER)