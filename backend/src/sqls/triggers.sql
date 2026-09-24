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
