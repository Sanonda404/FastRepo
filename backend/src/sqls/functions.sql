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
