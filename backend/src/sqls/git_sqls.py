GET_RAW_BY_SHA = """
    SELECT 1::smallint AS type, content FROM commits WHERE repo_id = $1 AND sha = $2
    UNION ALL
    SELECT 3::smallint, content FROM blobs WHERE repo_id = $1 AND sha = $2
    UNION ALL
    SELECT 4::smallint, content::bytea FROM tags WHERE repo_id = $1 AND sha = $2
    UNION ALL
    SELECT 0::smallint, NULL::bytea
    WHERE EXISTS (
        SELECT 1 FROM tree_entries WHERE repo_id = $1 AND tree_sha = $2
    )
    LIMIT 1
"""

INSERT_COMMIT = """
    INSERT INTO commits (repo_id, sha, content, root_tree_sha, author_name, author_date, message)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (repo_id, sha) DO NOTHING
"""

INSERT_BLOB = """
    INSERT INTO blobs (repo_id, sha, content, size)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (repo_id, sha) DO NOTHING
"""

INSERT_TAG = """
    INSERT INTO tags (repo_id, sha, content)
    VALUES ($1, $2, $3)
    ON CONFLICT (repo_id, sha) DO NOTHING
"""

INSERT_HEAD_REF = """
    INSERT INTO refs (repo_id, name, symref)
    VALUES ($1, 'HEAD', $2)
    ON CONFLICT (repo_id, name) DO NOTHING
"""

UPSERT_REF = """
    INSERT INTO refs (repo_id, name, commit_sha)
    VALUES ($1, $2, $3)
    ON CONFLICT (repo_id, name) DO UPDATE SET commit_sha = $3, tag_sha = NULL, symref = NULL
"""

INSERT_COMMIT_PARENT = """
    INSERT INTO commit_parent (repo_id, commit_sha, parent_sha, parent_index)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (repo_id, commit_sha, parent_index) DO NOTHING
"""

DELETE_COMMIT_PARENTS = """
    DELETE FROM commit_parent WHERE repo_id = $1 AND commit_sha = $2
"""

INSERT_TREE_ENTRY = """
    INSERT INTO tree_entries (repo_id, tree_sha, name, mode, blob_sha, subtree_sha)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (repo_id, tree_sha, name) DO UPDATE SET mode = $4, blob_sha = $5, subtree_sha = $6
"""

DELETE_TREE_ENTRIES = """
    DELETE FROM tree_entries WHERE repo_id = $1 AND tree_sha = $2
"""

CHECK_OBJECT_EXISTS = """
    SELECT 1 FROM commits WHERE repo_id = $1 AND sha = $2
    UNION ALL
    SELECT 1 FROM blobs WHERE repo_id = $1 AND sha = $2
    UNION ALL
    SELECT 1 FROM tags WHERE repo_id = $1 AND sha = $2
    UNION ALL
    SELECT 1 FROM tree_entries WHERE repo_id = $1 AND tree_sha = $2
    LIMIT 1
"""

ITER_OBJECT_SHAS = """
    SELECT sha FROM commits WHERE repo_id = $1
    UNION
    SELECT sha FROM blobs WHERE repo_id = $1
    UNION
    SELECT sha FROM tags WHERE repo_id = $1
    UNION
    SELECT DISTINCT tree_sha FROM tree_entries WHERE repo_id = $1
"""

GET_TREE_ENTRIES = """
    SELECT name, mode, COALESCE(subtree_sha, blob_sha) AS sha FROM tree_entries
    WHERE repo_id = $1 AND tree_sha = $2 AND name <> ''
    ORDER BY name
"""

READ_LOOSE_REF = """
    SELECT COALESCE(CASE WHEN symref IS NOT NULL THEN 'ref: ' || symref END, tag_sha, commit_sha) AS value
    FROM refs WHERE repo_id = $1 AND name = $2
"""

ALL_REFS = """
    SELECT name FROM refs WHERE repo_id = $1
"""

SET_SYMREF = """
    INSERT INTO refs (repo_id, name, symref)
    VALUES ($1, $2, $3)
    ON CONFLICT (repo_id, name) DO UPDATE SET symref = $3, commit_sha = NULL, tag_sha = NULL
"""

SET_REF_IF_EQUALS = """
    UPDATE refs
    SET commit_sha = $3, tag_sha = $4, symref = NULL
    WHERE repo_id = $1 AND name = $2
      AND ($5::text IS NULL OR $5::text IN (commit_sha, tag_sha))
    RETURNING 1
"""

ADD_REF_IF_NEW = """
    INSERT INTO refs (repo_id, name, commit_sha, tag_sha)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (repo_id, name) DO NOTHING
    RETURNING 1
"""

REMOVE_REF_IF_EQUALS = """
    DELETE FROM refs
    WHERE repo_id = $1 AND name = $2
      AND ($3::text IS NULL OR $3::text IN (commit_sha, tag_sha) OR $3::text = symref)
    RETURNING 1
"""

GET_BRANCH_REFS = """
    SELECT name,
           COALESCE(CASE WHEN symref IS NOT NULL THEN 'ref: ' || symref END, tag_sha, commit_sha) AS value
    FROM refs
    WHERE repo_id = $1 AND name LIKE 'refs/heads/%'
    ORDER BY name
"""

GET_COMMIT_META = """
    SELECT c.sha, c.root_tree_sha, c.author_name, c.author_date, c.message,
           u.email AS author_email
    FROM commits c
    LEFT JOIN users u ON u.username = c.author_name
    WHERE c.repo_id = $1 AND c.sha = $2
"""

GET_COMMITS_META = """
    SELECT c.sha, c.root_tree_sha, c.author_name, c.author_date, c.message,
           u.email AS author_email
    FROM commits c
    LEFT JOIN users u ON u.username = c.author_name
    WHERE c.repo_id = $1 AND c.sha = ANY($2::text[])
"""

GET_PARENTS = """
    SELECT commit_sha, parent_sha FROM commit_parent
    WHERE repo_id = $1 AND commit_sha = ANY($2::text[])
    ORDER BY commit_sha, parent_index
"""

GET_BLOBS = """
    SELECT sha, content FROM blobs WHERE repo_id = $1 AND sha = ANY($2::text[])
"""

GET_TREE_ENTRIES_WITH_SIZES = """
    SELECT t.name, t.mode, COALESCE(t.subtree_sha, t.blob_sha) AS sha, b.size
    FROM tree_entries t
    LEFT JOIN blobs b ON b.repo_id = t.repo_id AND b.sha = t.blob_sha
    WHERE t.repo_id = $1 AND t.tree_sha = $2 AND t.name <> ''
    ORDER BY t.name
"""
