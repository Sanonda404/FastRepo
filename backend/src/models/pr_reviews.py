import asyncpg

PR_REVIEWS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS pr_reviews (
    id SERIAL PRIMARY KEY,
    pull_request_id INT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    reviewer_id INT REFERENCES users(id) ON DELETE SET NULL,
    decision VARCHAR(15) NOT NULL CHECK (decision IN ('APPROVED', 'REQUEST_CHANGES', 'COMMENTED', 'REJECTED')),
    body TEXT,
    reviewed_at TIMESTAMP NOT NULL DEFAULT NOW()
)
"""

PR_REVIEWS_INDEX_DDL = """
CREATE INDEX IF NOT EXISTS idx_pr_reviews_pr ON pr_reviews(pull_request_id)
"""

PR_REVIEW_PRIVILEGE_FUNC = """
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
"""

PR_REVIEW_PRIVILEGE_TRIGGER = """
DROP TRIGGER IF EXISTS check_pr_review_privilege ON pr_reviews;
CREATE TRIGGER check_pr_review_privilege
BEFORE INSERT OR UPDATE OF decision, reviewer_id, pull_request_id ON pr_reviews
FOR EACH ROW EXECUTE FUNCTION validate_pr_review_privilege();
"""

async def ensure_pr_reviews_table(pool: asyncpg.Pool) -> None:
    await pool.execute(PR_REVIEWS_TABLE_DDL)
    await pool.execute(PR_REVIEWS_INDEX_DDL)
    async with pool.acquire() as conn:
        await conn.execute(PR_REVIEW_PRIVILEGE_FUNC)
        await conn.execute(PR_REVIEW_PRIVILEGE_TRIGGER)
