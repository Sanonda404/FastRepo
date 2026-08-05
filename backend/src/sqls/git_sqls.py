GET_RAW_BY_SHA = """
    SELECT 1::smallint AS type, content FROM commits WHERE repo_id = $1 AND sha = $2
    UNION ALL
    SELECT 3::smallint, content FROM blobs WHERE repo_id = $1 AND sha = $2
    UNION ALL
    SELECT 4::smallint, content FROM tags WHERE repo_id = $1 AND sha = $2
    UNION ALL
    SELECT 0::smallint, NULL::bytea
    WHERE EXISTS (
        SELECT 1 FROM tree_entries WHERE repo_id = $1 AND tree_sha = $2
    )
    LIMIT 1
"""

INSERT_COMMIT = """
    INSERT INTO commits (repo_id, sha, content)
    VALUES ($1, $2, $3)
    ON CONFLICT (repo_id, sha) DO NOTHING
"""

INSERT_BLOB = """
    INSERT INTO blobs (repo_id, sha, content)
    VALUES ($1, $2, $3)
    ON CONFLICT (repo_id, sha) DO NOTHING
"""

INSERT_TAG = """
    INSERT INTO tags (repo_id, sha, content)
    VALUES ($1, $2, $3)
    ON CONFLICT (repo_id, sha) DO NOTHING
"""

INSERT_TREE_ENTRIES = """
    INSERT INTO tree_entries (repo_id, tree_sha, name, mode, sha)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (repo_id, tree_sha, name) DO UPDATE SET mode = $4, sha = $5
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
    SELECT name, mode, sha FROM tree_entries
    WHERE repo_id = $1 AND tree_sha = $2
    ORDER BY name
"""

READ_LOOSE_REF = """
    SELECT value FROM refs WHERE repo_id = $1 AND name = $2
"""

ALL_REFS = """
    SELECT name, value FROM refs WHERE repo_id = $1
"""

SET_SYMREF = """
    INSERT INTO refs (repo_id, name, value)
    VALUES ($1, $2, $3)
    ON CONFLICT (repo_id, name) DO UPDATE SET value = $3
"""

SET_REF_IF_EQUALS = """
    UPDATE refs
    SET value = $3::bytea
    WHERE repo_id = $1 AND name = $2 AND ($4::bytea IS NULL OR value = $4::bytea)
    RETURNING 1
"""

ADD_REF_IF_NEW = """
    INSERT INTO refs (repo_id, name, value)
    VALUES ($1, $2, $3::bytea)
    ON CONFLICT (repo_id, name) DO NOTHING
    RETURNING 1
"""

REMOVE_REF_IF_EQUALS = """
    DELETE FROM refs
    WHERE repo_id = $1 AND name = $2 AND ($3::bytea IS NULL OR value = $3::bytea)
    RETURNING 1
"""
