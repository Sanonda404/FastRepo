GET_NEXT_ISSUE_FUNCTION = """
    CREATE OR REPLACE FUNCTION get_next_issue_no(p_repo_id INT)
    RETURNS INT
    LANGUAGE sql
    STABLE
    AS $$
        SELECT COALESCE(
            (SELECT max(number) + 1 FROM issues WHERE repository_id = p_repo_id),1
        )
    $$;
"""

GET_ISSUE_COMMENTS_COUNT_FUNCTION = """
    CREATE OR REPLACE FUNCTION get_issue_comments_count(p_issue_id INT)
    RETURNS INT
    LANGUAGE sql
    STABLE
    AS $$
        SELECT COUNT(*) FROM issue_comments WHERE issue_id = p_issue_id;
    $$;
"""

GET_PULL_REQUESTS_OF_ISSUE_COUNT_FUNCTION = """
    CREATE OR REPLACE FUNCTION get_pr_of_issue_count(p_issue_id INT)
    RETURNS INT
    LANGUAGE sql
    STABLE
    AS $$
        SELECT COUNT(*) FROM issue_pull_requests WHERE issue_id = p_issue_id;
    $$;
"""

STAT_FUNCTIONS = (
    GET_ISSUE_COMMENTS_COUNT_FUNCTION,
    GET_NEXT_ISSUE_FUNCTION,
    GET_PULL_REQUESTS_OF_ISSUE_COUNT_FUNCTION
)