# create new repository
CREATE_REPOSITORY = """
    INSERT INTO repositories (owner_id, name, description, is_private)
    VALUES ($1, $2, $3, $4)
    RETURNING id, owner_id, name, description, is_private, parent_repository_id, default_branch, created_at
"""

GET_REPO_BY_USER_AND_REPOSIRY_NAME = """
    SELECT r.id, r.name, r.description, r.is_private, r.owner_id, r.default_branch, r.parent_repository_id, r.created_at
    FROM repositories r
    JOIN users u ON r.owner_id = u.id
    WHERE u.username = $1 AND r.name = $2
"""


FORK_REPOSITORY = """
    INSERT INTO repositories
    (owner_id, name, description, is_private, default_branch, parent_repository_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, description, is_private, default_branch, parent_repository_id, created_at
"""

COPY_BRANCHES = """
    INSERT INTO branches (repository_id, name, commit_id)
    SELECT $1, name, commit_id
    FROM branches
    WHERE repository_id = $2
"""

COPY_COMMITS = """
    INSERT INTO commits (id, repository_id, root_tree_id, author_id, message, committed_at)
    SELECT id, $1, root_tree_id, author_id, message, committed_at
    FROM commits
    WHERE repository_id = $2
    ON CONFLICT (id, repository_id) DO NOTHING
"""