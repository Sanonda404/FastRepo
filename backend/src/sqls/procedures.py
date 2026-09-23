import asyncpg

CREATE_ISSUE_PR_PROCEDURE = """
    CREATE OR REPLACE PROCEDURE create_pr_with_issues(
        p_repository_id INT,
        p_author_id INT,
        p_title VARCHAR(255),
        p_body TEXT,
        p_source_branch VARCHAR(100),
        p_target_branch VARCHAR(100),
        p_source_repository_id INT,
        p_issue_ids INT[],
        INOUT p_pr_id INT DEFAULT NULL
    )
    LANGUAGE plpgsql
    AS $$
    DECLARE
        v_missing_issue_id INT;
        v_wrong_repo_issue_id INT;
    BEGIN
        -- 1. Validate issue existence and repo matching inside SQL
        IF array_length(p_issue_ids, 1) > 0 THEN
            -- Check for non-existent issues
            SELECT id INTO v_missing_issue_id
            FROM unnest(p_issue_ids) AS id
            WHERE id NOT IN (SELECT id FROM issues);

            IF v_missing_issue_id IS NOT NULL THEN
                RAISE EXCEPTION 'ISSUE_NOT_FOUND:%', v_missing_issue_id;
            END IF;

            -- Check for issues belonging to a different repository
            SELECT id INTO v_wrong_repo_issue_id
            FROM issues
            WHERE id = ANY(p_issue_ids) AND repository_id <> p_repository_id
            LIMIT 1;

            IF v_wrong_repo_issue_id IS NOT NULL THEN
                RAISE EXCEPTION 'ISSUE_WRONG_REPO:%', v_wrong_repo_issue_id;
            END IF;
        END IF;

        -- Insert the Pull Request
        INSERT INTO pull_requests (
            repository_id,
            author_id,
            title,
            body,
            source_branch,
            target_branch,
            source_repository_id,
            state
        )
        VALUES (
            p_repository_id,
            p_author_id,
            p_title,
            p_body,
            p_source_branch,
            p_target_branch,
            p_source_repository_id,
            'open'
        )
        RETURNING id INTO p_pr_id;

        -- Link issues into the issue_pull_requests junction table
        IF array_length(p_issue_ids, 1) > 0 THEN
            INSERT INTO issue_pull_requests (issue_id, pull_request_id)
            SELECT unnest(p_issue_ids), p_pr_id
            ON CONFLICT DO NOTHING;
        END IF;
    END;
    $$;
"""

ADD_NEW_TEAM_MEMBER_PROCEDURE = """
    CREATE OR REPLACE PROCEDURE add_new_team_member(
        p_repository_id INT,
        p_user_id INT,
        p_team_id INT,
        INOUT p_collaborator_id INT DEFAULT NULL
    )
    LANGUAGE plpgsql
    AS $$
    DECLARE
        v_team_repo INT;
    BEGIN
        SELECT repository_id INTO v_team_repo FROM teams WHERE id = p_team_id;

        IF v_team_repo IS NULL THEN
            RAISE EXCEPTION 'TEAM_NOT_FOUND:%', p_team_id;
        END IF;

        IF v_team_repo <> p_repository_id THEN
            RAISE EXCEPTION 'TEAM_WRONG_REPO:%', p_team_id;
        END IF;

        INSERT INTO repository_collaborators (repository_id, user_id, role)
        VALUES (p_repository_id, p_user_id, 'Member')
        ON CONFLICT ON CONSTRAINT unique_repo_collaborator
        DO NOTHING
        RETURNING id INTO p_collaborator_id;

        IF p_collaborator_id IS NULL THEN
            SELECT id INTO p_collaborator_id FROM repository_collaborators
            WHERE repository_id = p_repository_id AND user_id = p_user_id;
        END IF;

        INSERT INTO team_members (team_id, member_id)
        VALUES (p_team_id, p_collaborator_id)
        ON CONFLICT (team_id, member_id) DO NOTHING;
    END;
    $$;
"""


async def ensure_procedures(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(CREATE_ISSUE_PR_PROCEDURE)
            await conn.execute(ADD_NEW_TEAM_MEMBER_PROCEDURE)
