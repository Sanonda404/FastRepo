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
        IF array_length(p_issue_ids, 1) > 0 THEN
            SELECT id INTO v_missing_issue_id
            FROM unnest(p_issue_ids) AS id
            WHERE id NOT IN (SELECT id FROM issues);

            IF v_missing_issue_id IS NOT NULL THEN
                RAISE EXCEPTION 'ISSUE_NOT_FOUND:%', v_missing_issue_id;
            END IF;

            SELECT id INTO v_wrong_repo_issue_id
            FROM issues
            WHERE id = ANY(p_issue_ids) AND repository_id <> p_repository_id
            LIMIT 1;

            IF v_wrong_repo_issue_id IS NOT NULL THEN
                RAISE EXCEPTION 'ISSUE_WRONG_REPO:%', v_wrong_repo_issue_id;
            END IF;
        END IF;

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

        IF array_length(p_issue_ids, 1) > 0 THEN
            INSERT INTO issue_pull_requests (issue_id, pull_request_id)
            SELECT unnest(p_issue_ids), p_pr_id
            ON CONFLICT DO NOTHING;
        END IF;
    END;
    $$;

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

CREATE OR REPLACE PROCEDURE attach_label_to_issue(
        p_repository_id INT,
        p_issue_number INT,
        p_name VARCHAR(50),
        p_color VARCHAR(7),
        INOUT p_label_id INT DEFAULT NULL,
        INOUT p_label_name VARCHAR(50) DEFAULT NULL,
        INOUT p_label_color VARCHAR(7) DEFAULT NULL
    )
    LANGUAGE plpgsql
    AS $$
    DECLARE
        v_issue_id INT;
        v_label_id INT;
    BEGIN
        SELECT i.id INTO v_issue_id
        FROM issues i
        WHERE i.repository_id = p_repository_id AND i.number = p_issue_number;

        IF v_issue_id IS NULL THEN
            RAISE EXCEPTION 'ISSUE_NOT_FOUND:%', p_issue_number;
        END IF;

        -- Exact name+color already attached: idempotent, nothing to do.
        SELECT l.id INTO v_label_id
        FROM issue_labels il
        INNER JOIN labels l ON l.id = il.label_id
        WHERE il.issue_id = v_issue_id AND l.name = p_name AND l.color = p_color
        LIMIT 1;

        IF v_label_id IS NULL THEN
            -- Any same-name label attached: reject, one name per issue.
            IF EXISTS (
                SELECT 1 FROM issue_labels il
                INNER JOIN labels l ON l.id = il.label_id
                WHERE il.issue_id = v_issue_id AND l.name = p_name
            ) THEN
                RAISE EXCEPTION 'LABEL_ALREADY_ATTACHED:%', p_name;
            END IF;

            -- Same name+color exists elsewhere: reuse it, no new labels row.
            SELECT l.id INTO v_label_id
            FROM labels l
            WHERE l.name = p_name AND l.color = p_color
            ORDER BY l.id
            LIMIT 1;

            IF v_label_id IS NULL THEN
                -- New label row (same name under a new color, or brand new).
                INSERT INTO labels (name, color)
                VALUES (p_name, p_color)
                RETURNING id INTO v_label_id;
            END IF;

            INSERT INTO issue_labels (issue_id, label_id)
            VALUES (v_issue_id, v_label_id)
            ON CONFLICT (issue_id, label_id) DO NOTHING;
        END IF;

        SELECT id, name, color INTO p_label_id, p_label_name, p_label_color
        FROM labels WHERE id = v_label_id;
    END;
    $$;

CREATE OR REPLACE PROCEDURE fork_repository_with_copy(
        p_owner_id INT,
        p_name VARCHAR(255),
        p_description TEXT,
        p_is_private BOOLEAN,
        p_default_branch VARCHAR(255),
        p_source_repo_id INT,
        INOUT p_new_repo_id INT DEFAULT NULL
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
        INSERT INTO repositories (owner_id, name, description, is_private, default_branch, parent_repository_id)
        VALUES (p_owner_id, p_name, p_description, p_is_private, p_default_branch, p_source_repo_id)
        RETURNING id INTO p_new_repo_id;

        INSERT INTO blobs (repo_id, sha, content, size)
        SELECT p_new_repo_id, sha, content, size FROM blobs WHERE repo_id = p_source_repo_id;

        INSERT INTO tags (repo_id, sha, content)
        SELECT p_new_repo_id, sha, content FROM tags WHERE repo_id = p_source_repo_id;

        INSERT INTO tree_entries (repo_id, tree_sha, name, mode, blob_sha, subtree_sha)
        SELECT p_new_repo_id, tree_sha, name, mode, blob_sha, subtree_sha FROM tree_entries WHERE repo_id = p_source_repo_id;

        INSERT INTO commits (repo_id, sha, content, root_tree_sha, author_name, author_date, message)
        SELECT p_new_repo_id, sha, content, root_tree_sha, author_name, author_date, message FROM commits WHERE repo_id = p_source_repo_id;

        INSERT INTO commit_parent (repo_id, commit_sha, parent_sha, parent_index)
        SELECT p_new_repo_id, commit_sha, parent_sha, parent_index FROM commit_parent WHERE repo_id = p_source_repo_id;

        INSERT INTO refs (repo_id, name, commit_sha, tag_sha, symref)
        SELECT p_new_repo_id, name, commit_sha, tag_sha, symref FROM refs WHERE repo_id = p_source_repo_id;
    END;
    $$;

CREATE OR REPLACE PROCEDURE update_default_branch(
        p_repo_id INT,
        p_branch VARCHAR(255)
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM refs WHERE repo_id = p_repo_id AND name = 'refs/heads/' || p_branch
        ) THEN
            RAISE EXCEPTION 'BRANCH_NOT_FOUND:%', p_branch;
        END IF;

        UPDATE repositories SET default_branch = p_branch WHERE id = p_repo_id;

        INSERT INTO refs (repo_id, name, symref)
        VALUES (p_repo_id, 'HEAD', 'refs/heads/' || p_branch)
        ON CONFLICT (repo_id, name)
        DO UPDATE SET symref = EXCLUDED.symref, commit_sha = NULL, tag_sha = NULL;
    END;
    $$;
