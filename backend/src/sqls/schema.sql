CREATE TABLE IF NOT EXISTS profile_pics (
    id SERIAL PRIMARY KEY,
    content BYTEA NOT NULL,
    mime_type VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    profile_pic_id INT REFERENCES profile_pics(id) ON DELETE SET NULL,

    CONSTRAINT users_email_format_chk CHECK (
        email LIKE '%_@_%'
        AND email NOT LIKE '% %'
    ),

    CONSTRAINT invalid_username_chk CHECK (
        username NOT IN ('login', 'register', 'forgot-password', 'reset-password', 'create', 'docs', 'api')
        AND username NOT LIKE '% %'
    )
);

CREATE TABLE IF NOT EXISTS repositories (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    default_branch VARCHAR(255),
    parent_repository_id INT REFERENCES repositories(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_owner_repo_name UNIQUE (owner_id, name),
    CONSTRAINT valid_repo_name CHECK (name ~ '^[A-Za-z0-9._-]+$'),
    CONSTRAINT valid_default_branch CHECK (default_branch IS NULL OR default_branch ~ '^[A-Za-z0-9._-]+$')
);

CREATE TABLE IF NOT EXISTS repository_collaborators (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(255) NOT NULL CHECK (role IN ('Admin', 'Maintainer', 'Member', 'Viewer')),
    CONSTRAINT unique_repo_collaborator UNIQUE (repository_id, user_id)
);

CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    parent_team_id INT REFERENCES teams(id) ON DELETE CASCADE,

    CONSTRAINT unique_team_name UNIQUE(repository_id, name)
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES repository_collaborators(id) ON DELETE CASCADE,
    CONSTRAINT team_members_pk PRIMARY KEY (team_id, member_id)
);

CREATE TABLE IF NOT EXISTS blobs (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha VARCHAR(40) NOT NULL,
    content BYTEA NOT NULL,
    size BIGINT NOT NULL,
    PRIMARY KEY (repo_id, sha)
);

CREATE TABLE IF NOT EXISTS tags (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha VARCHAR(40) NOT NULL,
    content TEXT NOT NULL,
    PRIMARY KEY (repo_id, sha)
);

CREATE TABLE IF NOT EXISTS tree_entries (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    tree_sha VARCHAR(40) NOT NULL,
    name TEXT NOT NULL,
    mode INT NOT NULL,
    blob_sha VARCHAR(40),
    subtree_sha VARCHAR(40),
    subtree_ref TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (repo_id, tree_sha, name),
    CONSTRAINT tree_entry_target_chk CHECK (num_nonnulls(blob_sha, subtree_sha) = 1),
    FOREIGN KEY (repo_id, blob_sha)
        REFERENCES blobs(repo_id, sha) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (repo_id, subtree_sha, subtree_ref)
        REFERENCES tree_entries(repo_id, tree_sha, name) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS commits (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha VARCHAR(40) NOT NULL,
    content BYTEA NOT NULL,
    root_tree_sha VARCHAR(40),
    root_tree_ref TEXT NOT NULL DEFAULT '',
    author_name VARCHAR(255),
    author_date TIMESTAMPTZ,
    message TEXT,
    PRIMARY KEY (repo_id, sha),
    FOREIGN KEY (repo_id, root_tree_sha, root_tree_ref)
        REFERENCES tree_entries(repo_id, tree_sha, name) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS refs (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    commit_sha VARCHAR(40),
    tag_sha VARCHAR(40),
    symref TEXT,
    PRIMARY KEY (repo_id, name),
    CONSTRAINT ref_target_chk CHECK (num_nonnulls(commit_sha, tag_sha, symref) = 1),
    FOREIGN KEY (repo_id, commit_sha)
        REFERENCES commits(repo_id, sha) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (repo_id, tag_sha)
        REFERENCES tags(repo_id, sha) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (repo_id, symref)
        REFERENCES refs(repo_id, name) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS commit_parent (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_sha VARCHAR(40) NOT NULL,
    parent_sha VARCHAR(40) NOT NULL,
    parent_index INT NOT NULL,
    PRIMARY KEY (repo_id, commit_sha, parent_index),
    FOREIGN KEY (repo_id, commit_sha)
        REFERENCES commits(repo_id, sha) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (repo_id, parent_sha)
        REFERENCES commits(repo_id, sha) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS issues(
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    closed_by_id INT REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    number INT NOT NULL,
    state VARCHAR(20) NOT NULL DEFAULT 'open' CONSTRAINT issues_state_chk CHECK (state IN ('open', 'closed')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP,
    CONSTRAINT unique_issue_number UNIQUE (repository_id, number)
);

CREATE TABLE IF NOT EXISTS labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6b7280'
        CHECK (color ~* '^#[0-9a-f]{6}$'),
    CONSTRAINT unique_label_name_color UNIQUE (name, color)
);

CREATE TABLE IF NOT EXISTS issue_comments (
    id SERIAL PRIMARY KEY,
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pull_requests (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    state VARCHAR(20) NOT NULL DEFAULT 'open'
        CONSTRAINT pull_requests_state_chk CHECK (state IN ('open', 'closed')),
    source_branch VARCHAR(255) NOT NULL,
    target_branch VARCHAR(255) NOT NULL,
    source_repository_id INT REFERENCES repositories(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP,
    merged BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS pr_reviews (
    id SERIAL PRIMARY KEY,
    pull_request_id INT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    reviewer_id INT REFERENCES users(id) ON DELETE SET NULL,
    decision VARCHAR(15) NOT NULL CHECK (decision IN ('APPROVED', 'REQUEST_CHANGES', 'COMMENTED', 'REJECTED')),
    body TEXT,
    reviewed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stars (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    repository_id INT REFERENCES repositories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, repository_id)
);

CREATE TABLE IF NOT EXISTS issue_assignees (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    collaborator_id INT NOT NULL REFERENCES repository_collaborators(id) ON DELETE CASCADE,
    CONSTRAINT issue_assignees_pkey PRIMARY KEY (issue_id, collaborator_id)
);

CREATE TABLE IF NOT EXISTS issue_labels (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id INT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    CONSTRAINT issue_labels_pkey PRIMARY KEY (issue_id, label_id)
);

CREATE TABLE IF NOT EXISTS issue_pull_requests (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    pull_request_id INT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,

    PRIMARY KEY (issue_id, pull_request_id)
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('branch', 'folder')),
    target_identifier TEXT NOT NULL,
    allow_write BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_team_permission UNIQUE (team_id, target_type, target_identifier)
);

CREATE INDEX IF NOT EXISTS idx_repos_parent_id ON repositories(parent_repository_id);

CREATE INDEX IF NOT EXISTS idx_teams_parent ON teams(parent_team_id);

CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON team_members(member_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_repo_number ON issues(repository_id, number);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON issue_comments(issue_id);

CREATE INDEX IF NOT EXISTS idx_pull_requests_repo ON pull_requests(repository_id);

CREATE INDEX IF NOT EXISTS idx_pr_reviews_pr ON pr_reviews(pull_request_id);

CREATE INDEX IF NOT EXISTS idx_stars_repo ON stars(repository_id);

CREATE INDEX IF NOT EXISTS idx_perm_team_target ON permissions(team_id, target_type, target_identifier);
CREATE INDEX IF NOT EXISTS idx_perm_team ON permissions(team_id);

CREATE OR REPLACE FUNCTION can_access_repository(p_repo_id INT, p_user_id INT)
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE
    AS $$
        SELECT EXISTS (
            SELECT 1 FROM repositories WHERE id = p_repo_id AND owner_id = p_user_id
            UNION ALL
            SELECT 1 FROM repository_collaborators WHERE repository_id = p_repo_id AND user_id = p_user_id
        );
    $$;

CREATE OR REPLACE FUNCTION is_privileged_on_repo(p_repo_id INT, p_owner_id INT, p_user_id INT)
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE
    AS $$
        SELECT p_owner_id = p_user_id
            OR EXISTS (
                SELECT 1 FROM repository_collaborators
                WHERE repository_id = p_repo_id AND user_id = p_user_id AND role IN ('Admin', 'Maintainer')
            );
    $$;

CREATE OR REPLACE FUNCTION can_manage_issue(p_repo_id INT, p_issue_number INT, p_user_id INT)
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE
    AS $$
        SELECT EXISTS (
                SELECT 1 FROM issues
                WHERE repository_id = p_repo_id AND number = p_issue_number AND author_id = p_user_id
            )
            OR is_privileged_on_repo(
                p_repo_id,
                (SELECT owner_id FROM repositories WHERE id = p_repo_id),
                p_user_id
            )
            OR EXISTS (
                SELECT 1 FROM issue_assignees ia
                INNER JOIN issues i ON i.id = ia.issue_id
                INNER JOIN repository_collaborators c ON c.id = ia.collaborator_id
                WHERE i.repository_id = p_repo_id AND i.number = p_issue_number AND c.user_id = p_user_id
            );
    $$;

CREATE OR REPLACE FUNCTION can_moderate_issue(p_repo_id INT, p_issue_number INT, p_user_id INT)
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE
    AS $$
        SELECT is_privileged_on_repo(
                p_repo_id,
                (SELECT owner_id FROM repositories WHERE id = p_repo_id),
                p_user_id
            )
            OR EXISTS (
                SELECT 1 FROM issue_assignees ia
                INNER JOIN issues i ON i.id = ia.issue_id
                INNER JOIN repository_collaborators c ON c.id = ia.collaborator_id
                WHERE i.repository_id = p_repo_id AND i.number = p_issue_number AND c.user_id = p_user_id
            );
    $$;

CREATE OR REPLACE FUNCTION can_manage_pr(p_repo_id INT, p_pr_id INT, p_user_id INT)
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE
    AS $$
        SELECT EXISTS (
                SELECT 1 FROM pull_requests
                WHERE id = p_pr_id AND repository_id = p_repo_id AND author_id = p_user_id
            )
            OR is_privileged_on_repo(
                p_repo_id,
                (SELECT owner_id FROM repositories WHERE id = p_repo_id),
                p_user_id
            );
    $$;

CREATE OR REPLACE FUNCTION validate_team_is_from_same_repo(
        p_repository_id INT,
        p_team_id INT
    )
    RETURNS BOOLEAN AS $$
    DECLARE
        v_repository_id INT;
    BEGIN
        SELECT repository_id INTO v_repository_id
        FROM teams
        WHERE id = p_team_id;

        IF v_repository_id IS DISTINCT FROM p_repository_id THEN
            RETURN FALSE;
        ELSE
            RETURN TRUE;
        END IF;
    END;
    $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_issue_comments_count(p_issue_id INT)
    RETURNS INT
    LANGUAGE sql
    STABLE
    AS $$
        SELECT COUNT(*) FROM issue_comments WHERE issue_id = p_issue_id;
    $$;

CREATE OR REPLACE FUNCTION get_next_issue_no(p_repo_id INT)
    RETURNS INT
    LANGUAGE sql
    STABLE
    AS $$
        SELECT COALESCE(
            (SELECT max(number) + 1 FROM issues WHERE repository_id = p_repo_id),1
        )
    $$;

CREATE OR REPLACE FUNCTION get_pr_of_issue_count(p_issue_id INT)
    RETURNS INT
    LANGUAGE sql
    STABLE
    AS $$
        SELECT COUNT(*) FROM issue_pull_requests WHERE issue_id = p_issue_id;
    $$;

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

CREATE OR REPLACE PROCEDURE create_repository_with_setup(
        p_owner_id INT,
        p_name VARCHAR(255),
        p_description TEXT,
        p_is_private BOOLEAN,
        p_default_branch VARCHAR(255),
        p_commit_sha VARCHAR(40),
        p_commit_content BYTEA,
        p_seed_author_name TEXT,
        p_seed_author_date TIMESTAMPTZ,
        p_seed_message TEXT,
        INOUT p_new_repo_id INT DEFAULT NULL
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
        INSERT INTO repositories (owner_id, name, description, is_private, default_branch)
        VALUES (p_owner_id, p_name, p_description, p_is_private, p_default_branch)
        RETURNING id INTO p_new_repo_id;

        INSERT INTO repository_collaborators (repository_id, user_id, role)
        VALUES (p_new_repo_id, p_owner_id, 'Admin')
        ON CONFLICT (repository_id, user_id) DO NOTHING;

        IF p_default_branch IS NOT NULL THEN
            INSERT INTO refs (repo_id, name, symref)
            VALUES (p_new_repo_id, 'HEAD', 'refs/heads/' || p_default_branch)
            ON CONFLICT (repo_id, name) DO NOTHING;

            INSERT INTO commits (repo_id, sha, content, root_tree_sha, author_name, author_date, message)
            VALUES (p_new_repo_id, p_commit_sha, p_commit_content, NULL, p_seed_author_name, p_seed_author_date, p_seed_message)
            ON CONFLICT (repo_id, sha) DO NOTHING;

            INSERT INTO refs (repo_id, name, commit_sha)
            VALUES (p_new_repo_id, 'refs/heads/' || p_default_branch, p_commit_sha)
            ON CONFLICT (repo_id, name) DO UPDATE SET commit_sha = EXCLUDED.commit_sha, tag_sha = NULL, symref = NULL;
        END IF;
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

CREATE OR REPLACE FUNCTION validate_team_collaborator_from_same_repo()
    RETURNS TRIGGER AS $$
    DECLARE
        v1_repository_id INT;
        v2_repository_id INT;
    BEGIN
        SELECT repository_id INTO v1_repository_id
        FROM teams
        WHERE id = NEW.team_id;
        
        SELECT repository_id INTO v2_repository_id
        FROM repository_collaborators
        WHERE id = NEW.member_id;

        IF v1_repository_id IS DISTINCT FROM v2_repository_id THEN
            RAISE EXCEPTION 'Constraint Violation: Team and collaborator are not part of same repository';
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_viewer_role_repo_privacy()
    RETURNS TRIGGER AS $$
    DECLARE
        v_is_private BOOLEAN;
    BEGIN
        IF NEW.role = 'Viewer' THEN
            SELECT is_private INTO v_is_private
            FROM repositories
            WHERE id = NEW.repository_id;

            IF v_is_private IS FALSE THEN
                RAISE EXCEPTION 'Constraint Violation: Role "Viewer" can only be assigned to private repositories.';
            END IF;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_no_viewer_in_public_repo()
    RETURNS TRIGGER AS $$
    DECLARE
        v_has_viewer BOOLEAN;
    BEGIN
        IF NEW.is_private = FALSE THEN
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

CREATE OR REPLACE FUNCTION forbid_owner_collaborator_change()
    RETURNS TRIGGER AS $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM repositories r
            WHERE r.id = OLD.repository_id AND r.owner_id = OLD.user_id
        ) THEN
            RAISE EXCEPTION 'Cannot modify the repository owner collaborator row';
        END IF;
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_orphan_label()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM labels
    WHERE id = OLD.label_id
        AND NOT EXISTS (
            SELECT 1 FROM issue_labels WHERE label_id = OLD.label_id
        );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_unique_label_name_per_issue()
RETURNS TRIGGER AS $$
DECLARE
    v_new_name VARCHAR(50);
BEGIN
    SELECT name INTO v_new_name FROM labels WHERE id = NEW.label_id;

    IF v_new_name IS NULL THEN
        RAISE EXCEPTION 'Constraint Violation: Label % not found', NEW.label_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM issue_labels il
        INNER JOIN labels l ON l.id = il.label_id
        WHERE il.issue_id = NEW.issue_id
            AND l.name = v_new_name
            AND il.label_id IS DISTINCT FROM NEW.label_id
    ) THEN
        RAISE EXCEPTION 'Constraint Violation: Issue % already has a label named %', NEW.issue_id, v_new_name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_issue_pull_request_same_repo()
RETURNS TRIGGER AS $$
DECLARE
    v_issue_repo_id INT;
    v_pr_repo_id INT;
BEGIN
    SELECT repository_id INTO v_issue_repo_id
    FROM issues
    WHERE id = NEW.issue_id;

    SELECT repository_id INTO v_pr_repo_id
    FROM pull_requests
    WHERE id = NEW.pull_request_id;

    IF v_issue_repo_id IS NULL OR v_pr_repo_id IS NULL THEN
        RAISE EXCEPTION 'Constraint Violation: Issue % or pull request % not found', NEW.issue_id, NEW.pull_request_id;
    END IF;

    IF v_issue_repo_id IS DISTINCT FROM v_pr_repo_id THEN
        RAISE EXCEPTION 'Constraint Violation: Issue and pull request must belong to same repository';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_pr_review_privilege()
RETURNS TRIGGER AS $$
DECLARE
    v_repo_id INT;
    v_owner_id INT;
    v_is_privileged BOOLEAN;
BEGIN
    SELECT repository_id INTO v_repo_id FROM pull_requests WHERE id = NEW.pull_request_id;
    IF v_repo_id IS NULL THEN
        RAISE EXCEPTION 'Pull request % not found', NEW.pull_request_id;
    END IF;
    SELECT owner_id INTO v_owner_id FROM repositories WHERE id = v_repo_id;

    IF NEW.reviewer_id IS NULL THEN
        v_is_privileged := FALSE;
    ELSIF NEW.reviewer_id = v_owner_id THEN
        v_is_privileged := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM repository_collaborators
            WHERE repository_id = v_repo_id AND user_id = NEW.reviewer_id AND role IN ('Admin', 'Maintainer')
        ) INTO v_is_privileged;
    END IF;

    IF NOT v_is_privileged AND NEW.decision IN ('APPROVED', 'REQUEST_CHANGES', 'REJECTED') THEN
        RAISE EXCEPTION 'Only owner, admin, or maintainer can use decision %', NEW.decision USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_team_collaborator_from_same_repo ON team_members;

    CREATE TRIGGER validate_team_collaborator_from_same_repo
    BEFORE INSERT OR UPDATE OF team_id, member_id
    ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION validate_team_collaborator_from_same_repo();

DROP TRIGGER IF EXISTS check_viewer_role_privacy ON repository_collaborators;
    CREATE TRIGGER check_viewer_role_privacy
    BEFORE INSERT OR UPDATE OF role, repository_id
    ON repository_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION validate_viewer_role_repo_privacy();

DROP TRIGGER IF EXISTS check_is_private_update ON repositories;
    CREATE TRIGGER check_is_private_update
    BEFORE UPDATE OF is_private
    ON repositories
    FOR EACH ROW
    EXECUTE FUNCTION validate_no_viewer_in_public_repo();

DROP TRIGGER IF EXISTS forbid_owner_collaborator_change ON repository_collaborators;
    CREATE TRIGGER forbid_owner_collaborator_change
    BEFORE UPDATE OR DELETE ON repository_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION forbid_owner_collaborator_change();

DROP TRIGGER IF EXISTS delete_orphan_label ON issue_labels;
CREATE TRIGGER delete_orphan_label
AFTER DELETE ON issue_labels
FOR EACH ROW
EXECUTE FUNCTION delete_orphan_label();

DROP TRIGGER IF EXISTS validate_unique_label_name_per_issue ON issue_labels;
CREATE TRIGGER validate_unique_label_name_per_issue
BEFORE INSERT OR UPDATE OF issue_id, label_id
ON issue_labels
FOR EACH ROW
EXECUTE FUNCTION validate_unique_label_name_per_issue();

DROP TRIGGER IF EXISTS validate_issue_pull_request_same_repo ON issue_pull_requests;
CREATE TRIGGER validate_issue_pull_request_same_repo
BEFORE INSERT OR UPDATE OF issue_id, pull_request_id
ON issue_pull_requests
FOR EACH ROW
EXECUTE FUNCTION validate_issue_pull_request_same_repo();

DROP TRIGGER IF EXISTS check_pr_review_privilege ON pr_reviews;
CREATE TRIGGER check_pr_review_privilege
BEFORE INSERT OR UPDATE OF decision, reviewer_id, pull_request_id ON pr_reviews
FOR EACH ROW EXECUTE FUNCTION validate_pr_review_privilege();
