import asyncpg

REPOSITORY_COLLABORATORS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS repository_collaborators (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(255) NOT NULL CHECK (role IN ('Admin', 'Maintainer', 'Member', 'Viewer')),
    CONSTRAINT unique_repo_collaborator UNIQUE (repository_id, user_id)
);
"""

CHECK_VIEWER_ONLY_IN_PRIVATE_REPO_TRIGGER_FUNCTION = """
    CREATE OR REPLACE FUNCTION validate_viewer_role_repo_privacy()
    RETURNS TRIGGER AS $$
    DECLARE
        v_is_private BOOLEAN;
    BEGIN
        -- Check if the role being added/updated is 'Viewer'
        IF NEW.role = 'Viewer' THEN
            -- Fetch the privacy status from the referenced repository
            SELECT is_private INTO v_is_private
            FROM repositories
            WHERE id = NEW.repository_id;

            -- If the repository is not private, prevent insertion/update
            IF v_is_private IS FALSE THEN
                RAISE EXCEPTION 'Constraint Violation: Role "Viewer" can only be assigned to private repositories.';
            END IF;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
"""

CHECK_VIEWER_IN_PRIVATE_TO_PUBLIC_REPO_UPDATE_TRIGGER_FUNCTION = """
    CREATE OR REPLACE FUNCTION validate_no_viewer_in_public_repo()
    RETURNS TRIGGER AS $$
    DECLARE
        v_has_viewer BOOLEAN;
    BEGIN
        -- Only check if repository is changing to public
        IF NEW.is_private = FALSE THEN
            -- Short-circuit check: returns TRUE immediately on the first match
            SELECT EXISTS (
                SELECT 1 
                FROM repository_collaborators
                WHERE repository_id = NEW.id
                AND role = 'Viewer'
            ) INTO v_has_viewer;

            IF v_has_viewer THEN
                RAISE EXCEPTION '"Viewer" can only be assigned to private repositories. Remove them or change their role before making this repository public.';
            END IF;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
"""

CHECK_VIEWER_ONLY_IN_PRIVATE_REPO_TRIGGER = """
    DROP TRIGGER IF EXISTS check_viewer_role_privacy ON repository_collaborators;
    CREATE TRIGGER check_viewer_role_privacy
    BEFORE INSERT OR UPDATE OF role, repository_id
    ON repository_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION validate_viewer_role_repo_privacy();
"""

CHECK_VIEWER_IN_PRIVATE_TO_PUBLIC_REPO_UPDATE_TRIGGER = """
    DROP TRIGGER IF EXISTS check_is_private_update ON repositories;
    CREATE TRIGGER check_is_private_update
    BEFORE UPDATE OF is_private
    ON repositories
    FOR EACH ROW
    EXECUTE FUNCTION validate_no_viewer_in_public_repo();
"""

async def ensure_repository_collaborators_table(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(REPOSITORY_COLLABORATORS_TABLE_DDL)
            await conn.execute(CHECK_VIEWER_ONLY_IN_PRIVATE_REPO_TRIGGER_FUNCTION)
            await conn.execute(CHECK_VIEWER_ONLY_IN_PRIVATE_REPO_TRIGGER)
            await conn.execute(CHECK_VIEWER_IN_PRIVATE_TO_PUBLIC_REPO_UPDATE_TRIGGER_FUNCTION)
            await conn.execute(CHECK_VIEWER_IN_PRIVATE_TO_PUBLIC_REPO_UPDATE_TRIGGER)