import asyncpg

EMPTY_TREE_SHA = b"4b825dc642cb6eb9a060e54bf8d69288fbee4904"

# later extract info from binary content to columns

COMMITS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS commits (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha BYTEA NOT NULL,
    content BYTEA NOT NULL,
    PRIMARY KEY (repo_id, sha)
);
"""

BLOBS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS blobs (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha BYTEA NOT NULL,
    content BYTEA NOT NULL,
    PRIMARY KEY (repo_id, sha)
);
"""

TAGS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS tags (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha BYTEA NOT NULL,
    content BYTEA NOT NULL,
    PRIMARY KEY (repo_id, sha)
);
"""

TREE_ENTRIES_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS tree_entries (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    tree_sha BYTEA NOT NULL,
    name BYTEA NOT NULL,
    mode INT NOT NULL,
    sha BYTEA NOT NULL,
    PRIMARY KEY (repo_id, tree_sha, name)
);
"""

REFS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS refs (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name BYTEA NOT NULL,
    value BYTEA NOT NULL,
    PRIMARY KEY (repo_id, name)
);
"""
async def ensure_tables(pool: asyncpg.Pool) -> None:
    await pool.execute(COMMITS_TABLE_DDL)
    await pool.execute(BLOBS_TABLE_DDL)
    await pool.execute(TAGS_TABLE_DDL)
    await pool.execute(TREE_ENTRIES_TABLE_DDL)
    await pool.execute(REFS_TABLE_DDL)
