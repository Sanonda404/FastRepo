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


UPDATE_REPOSITORY = """
    UPDATE repositories
    SET name = COALESCE($3, name),
        description = COALESCE($4, description),
        is_private = COALESCE($5, is_private)
    WHERE owner_id = $1 AND name = $2
    RETURNING id, owner_id, name, description, is_private, parent_repository_id, default_branch, created_at
"""


DELETE_REPOSITORY = """
    DELETE FROM repositories
    WHERE owner_id = $1 AND name = $2
    RETURNING id
"""


# check if a user can access a repository (owner or collaborator)
CHECK_REPO_ACCESS = """
    SELECT EXISTS (
        SELECT 1 FROM repositories WHERE id = $1 AND owner_id = $2
        UNION ALL
        SELECT 1 FROM repository_collaborators WHERE repository_id = $1 AND user_id = $2
    )
"""


FORK_REPOSITORY = """
    INSERT INTO repositories
    (owner_id, name, description, is_private, default_branch, parent_repository_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, owner_id, name, description, is_private, default_branch, parent_repository_id, created_at
"""

COPY_FORK_COMMITS = """
    INSERT INTO commits (repo_id, sha, content, root_tree_sha, author_name, author_date, message)
    SELECT $1, sha, content, root_tree_sha, author_name, author_date, message FROM commits WHERE repo_id = $2
"""

COPY_FORK_BLOBS = """
    INSERT INTO blobs (repo_id, sha, content, size)
    SELECT $1, sha, content, size FROM blobs WHERE repo_id = $2
"""

COPY_FORK_TAGS = """
    INSERT INTO tags (repo_id, sha, content)
    SELECT $1, sha, content FROM tags WHERE repo_id = $2
"""

COPY_FORK_TREE_ENTRIES = """
    INSERT INTO tree_entries (repo_id, tree_sha, name, mode, sha)
    SELECT $1, tree_sha, name, mode, sha FROM tree_entries WHERE repo_id = $2
"""

COPY_FORK_COMMIT_PARENTS = """
    INSERT INTO commit_parent (repo_id, commit_sha, parent_sha, parent_index)
    SELECT $1, commit_sha, parent_sha, parent_index FROM commit_parent WHERE repo_id = $2
"""

COPY_FORK_REFS = """
    INSERT INTO refs (repo_id, name, value)
    SELECT $1, name, value FROM refs WHERE repo_id = $2
"""