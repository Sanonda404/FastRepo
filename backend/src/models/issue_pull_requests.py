import asyncpg

ISSUE_PULL_REQUESTS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS issue_pull_requests (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    pull_request_id INT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,

    PRIMARY KEY (issue_id, pull_request_id)
)
"""


ISSUE_PR_SAME_REPO_FUNC = """
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
"""

ISSUE_PR_SAME_REPO_TRIGGER = """
DROP TRIGGER IF EXISTS validate_issue_pull_request_same_repo ON issue_pull_requests;
CREATE TRIGGER validate_issue_pull_request_same_repo
BEFORE INSERT OR UPDATE OF issue_id, pull_request_id
ON issue_pull_requests
FOR EACH ROW
EXECUTE FUNCTION validate_issue_pull_request_same_repo();
"""


async def ensure_issue_pull_requests_table(pool: asyncpg.Pool) -> None:
    await pool.execute(ISSUE_PULL_REQUESTS_TABLE_DDL)
    async with pool.acquire() as conn:
        await conn.execute(ISSUE_PR_SAME_REPO_FUNC)
        await conn.execute(ISSUE_PR_SAME_REPO_TRIGGER)
