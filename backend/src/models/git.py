import asyncpg

EMPTY_TREE_SHA = b"4b825dc642cb6eb9a060e54bf8d69288fbee4904"
EMPTY_TREE_SHA_HEX = EMPTY_TREE_SHA.decode("ascii")

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
    blob_sha VARCHAR(40),
    subtree_sha VARCHAR(40),
    subtree_ref TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (repo_id, tree_sha, name),
    CONSTRAINT tree_entry_target_chk CHECK (num_nonnulls(blob_sha, subtree_sha) = 1),
    FOREIGN KEY (repo_id, blob_sha)
        REFERENCES blobs(repo_id, sha) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (repo_id, subtree_sha, subtree_ref)
        REFERENCES tree_entries(repo_id, tree_sha, name) DEFERRABLE INITIALLY DEFERRED
);
"""

COMMITS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS commits (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha VARCHAR(40) NOT NULL,
    content BYTEA NOT NULL,
    root_tree_sha VARCHAR(40),
    root_tree_ref TEXT NOT NULL DEFAULT '',
    author_name VARCHAR(255),
    author_date TIMESTAMPTZ,
    message TEXT,
    PRIMARY KEY (repo_id, sha),
    FOREIGN KEY (repo_id, root_tree_sha, root_tree_ref)
        REFERENCES tree_entries(repo_id, tree_sha, name) DEFERRABLE INITIALLY DEFERRED
);
"""

REFS_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS refs (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    commit_sha VARCHAR(40),
    tag_sha VARCHAR(40),
    symref TEXT,
    PRIMARY KEY (repo_id, name),
    CONSTRAINT ref_target_chk CHECK (num_nonnulls(commit_sha, tag_sha, symref) = 1),
    FOREIGN KEY (repo_id, commit_sha)
        REFERENCES commits(repo_id, sha) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (repo_id, tag_sha)
        REFERENCES tags(repo_id, sha) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (repo_id, symref)
        REFERENCES refs(repo_id, name) DEFERRABLE INITIALLY DEFERRED
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
    await pool.execute(BLOBS_TABLE_DDL)
    await pool.execute(TAGS_TABLE_DDL)
    await pool.execute(TREE_ENTRIES_TABLE_DDL)
    await pool.execute(COMMITS_TABLE_DDL)
    await pool.execute(REFS_TABLE_DDL)
    await pool.execute(COMMIT_PARENT_TABLE_DDL)
