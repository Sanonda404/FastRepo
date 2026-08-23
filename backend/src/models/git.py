import asyncpg

EMPTY_TREE_SHA = b"4b825dc642cb6eb9a060e54bf8d69288fbee4904"
EMPTY_TREE_SHA_HEX = EMPTY_TREE_SHA.decode("ascii")

COMMITS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS commits (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha VARCHAR(40) NOT NULL,
    content BYTEA NOT NULL,
    root_tree_sha VARCHAR(40),
    author_name VARCHAR(255),
    author_date TIMESTAMPTZ,
    message TEXT,
    PRIMARY KEY (repo_id, sha)
);
"""

BLOBS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS blobs (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha VARCHAR(40) NOT NULL,
    content BYTEA NOT NULL,
    size BIGINT NOT NULL,
    PRIMARY KEY (repo_id, sha)
);
"""

TAGS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS tags (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha VARCHAR(40) NOT NULL,
    content TEXT NOT NULL,
    PRIMARY KEY (repo_id, sha)
);
"""

TREE_ENTRIES_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS tree_entries (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    tree_sha VARCHAR(40) NOT NULL,
    name TEXT NOT NULL,
    mode INT NOT NULL,
    sha VARCHAR(40) NOT NULL,
    PRIMARY KEY (repo_id, tree_sha, name)
);
"""

REFS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS refs (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (repo_id, name)
);
"""

COMMIT_PARENT_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS commit_parent (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_sha VARCHAR(40) NOT NULL,
    parent_sha VARCHAR(40) NOT NULL,
    parent_index INT NOT NULL,
    PRIMARY KEY (repo_id, commit_sha, parent_index),
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
    await pool.execute("ALTER TABLE commits ALTER COLUMN root_tree_sha DROP NOT NULL")
    await pool.execute("UPDATE commits SET root_tree_sha = NULL WHERE root_tree_sha = $1", EMPTY_TREE_SHA_HEX)
