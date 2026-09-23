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

async def ensure_procedures(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(CREATE_ISSUE_PR_PROCEDURE)