import asyncpg

EMPTY_TREE_SHA = b"4b825dc642cb6eb9a060e54bf8d69288fbee4904"

COMMITS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS commits (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha BYTEA NOT NULL,
    content BYTEA NOT NULL,
    root_tree_sha BYTEA NOT NULL,
    author_name BYTEA,
    author_date TIMESTAMPTZ,
    message BYTEA,
    PRIMARY KEY (repo_id, sha)
);
"""

BLOBS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS blobs (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha BYTEA NOT NULL,
    content BYTEA NOT NULL,
    size BIGINT NOT NULL,
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

COMMIT_PARENT_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS commit_parent (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_sha BYTEA NOT NULL,
    parent_sha BYTEA NOT NULL,
    parent_index INT NOT NULL,
    FOREIGN KEY (repo_id, commit_sha)
        REFERENCES commits(repo_id, sha) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (repo_id, parent_sha)
        REFERENCES commits(repo_id, sha) DEFERRABLE INITIALLY DEFERRED
);
"""

async def ensure_tables(pool: asyncpg.Pool) -> None:
    await pool.execute(COMMITS_TABLE_DDL)
    await pool.execute(BLOBS_TABLE_DDL)
    await pool.execute(TAGS_TABLE_DDL)
    await pool.execute(TREE_ENTRIES_TABLE_DDL)
    await pool.execute(REFS_TABLE_DDL)
    await pool.execute(COMMIT_PARENT_TABLE_DDL)
