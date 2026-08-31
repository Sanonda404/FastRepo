# create new repository
CREATE_REPOSITORY = """
    INSERT INTO repositories (owner_id, name, description, is_private)
    VALUES ($1, $2, $3, $4)
    RETURNING id, owner_id, name, description, is_private, parent_repository_id, default_branch, created_at
"""

GET_REPO_BY_USER_AND_REPOSIRY_NAME = """
    SELECT r.id, r.name, r.description, r.is_private, r.owner_id, r.default_branch, r.parent_repository_id, r.created_at
    FROM repositories r
    INNER JOIN users u ON r.owner_id = u.id
    WHERE u.username = $1 AND r.name = $2
"""
GET_ALL_REPOS_OF_OWNER_BY_OWNER_ID = """
    SELECT r.id, r.name, r.description, r.is_private, r.owner_id, r.default_branch, r.parent_repository_id, r.created_at
    FROM repositories r
    WHERE r.owner_id = $1
"""

GET_ALL_PUBLIC_OF_OWNER_BY_OWNER_NAME = """
    SELECT r.id, r.name, r.description, r.is_private, r.owner_id, r.default_branch, r.parent_repository_id, r.created_at
    FROM repositories r
    INNER JOIN USERS u
    ON r.owner_id = u.id
    WHERE u.username = $1
    AND r.is_private = FALSE
"""

#user is not owner of the repositories, either collaborator or none
GET_ACCESIBLE_REPOS_OF_OWNER_BY_USERNAME = """
    SELECT
        r.id,
        r.name,
        r.description,
        r.is_private,
        r.owner_id,
        r.default_branch,
        r.parent_repository_id,
        r.created_at
    FROM repositories r
    INNER JOIN users u ON u.id = r.owner_id
    WHERE u.username = $1
    AND (
        r.is_private = FALSE
        OR EXISTS (
            SELECT 1
            FROM repository_collaborators rc
            WHERE rc.repository_id = r.id AND rc.user_id = $2
        )
    )
    ORDER BY r.created_at DESC;
"""

GET_ALL_ACCESIBLE_REPOS_OF_USER_BY_ID = """
    -- Repos owned by the user
    SELECT
        r.id,
        r.name,
        r.description,
        r.is_private,
        r.owner_id,
        r.default_branch,
        r.parent_repository_id,
        r.created_at,
        u.username AS owner_username,
        pu.username AS parent_owner_username,
        p.name AS parent_repository_name
    FROM repositories r
    INNER JOIN users u ON u.id = r.owner_id
    LEFT JOIN repositories p ON p.id = r.parent_repository_id
    LEFT JOIN users pu ON pu.id = p.owner_id
    WHERE u.id = $1

    UNION

    -- Repos where the user is a collaborator
    SELECT
        r.id,
        r.name,
        r.description,
        r.is_private,
        r.owner_id,
        r.default_branch,
        r.parent_repository_id,
        r.created_at,
        u.username AS owner_username,
        pu.username AS parent_owner_username,
        p.name AS parent_repository_name
    FROM repositories r
    INNER JOIN users u ON u.id = r.owner_id
    INNER JOIN repository_collaborators rc ON rc.repository_id = r.id
    LEFT JOIN repositories p ON p.id = r.parent_repository_id
    LEFT JOIN users pu ON pu.id = p.owner_id
    WHERE rc.user_id = $1

    ORDER BY created_at DESC;
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
GET_LIST_OF_ACCESSIBLE_FORKS = """
    SELECT
        c.id, c.name, c.description, c.is_private, c.owner_id, c.default_branch, c.parent_repository_id, c.created_at
    FROM repositories c
    WHERE c.parent_repository_id = $1
    AND (
        c.is_private = FALSE
        OR c.owner_id = $2
        OR EXISTS (
            SELECT 1
            FROM repository_collaborators rc
            WHERE rc.repository_id = c.id AND rc.user_id = $2
        )
    )
    ORDER BY c.created_at DESC
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
    INSERT INTO tree_entries (repo_id, tree_sha, name, mode, blob_sha, subtree_sha)
    SELECT $1, tree_sha, name, mode, blob_sha, subtree_sha FROM tree_entries WHERE repo_id = $2
"""

COPY_FORK_COMMITS = """
    INSERT INTO commits (repo_id, sha, content, root_tree_sha, author_name, author_date, message)
    SELECT $1, sha, content, root_tree_sha, author_name, author_date, message FROM commits WHERE repo_id = $2
"""

COPY_FORK_COMMIT_PARENTS = """
    INSERT INTO commit_parent (repo_id, commit_sha, parent_sha, parent_index)
    SELECT $1, commit_sha, parent_sha, parent_index FROM commit_parent WHERE repo_id = $2
"""

COPY_FORK_REFS = """
    INSERT INTO refs (repo_id, name, commit_sha, tag_sha, symref)
    SELECT $1, name, commit_sha, tag_sha, symref FROM refs WHERE repo_id = $2
"""

GET_STAR = """
    SELECT 1 FROM stars
    WHERE user_id = $1 AND repository_id = $2
"""

REMOVE_STAR = """
    DELETE FROM stars
    WHERE user_id = $1 AND repository_id = $2
    RETURNING user_id
"""
INSERT_STAR = """
    INSERT INTO stars (user_id, repository_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    RETURNING user_id;
"""
GET_REPOSITORY_STAR_COUNT = """
    SELECT count(*) FROM stars
    WHERE repository_id = $1
"""