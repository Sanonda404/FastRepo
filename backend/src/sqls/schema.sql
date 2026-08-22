CREATE TABLE IF NOT EXISTS profile_pics (
    id SERIAL PRIMARY KEY,
    content BYTEA NOT NULL,
    mime_type VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    profile_pic_id INT REFERENCES profile_pics(id) ON DELETE SET NULL,

    CONSTRAINT users_email_format_chk CHECK (
        email LIKE '%_@_%'
        AND email NOT LIKE '% %'
    )
);

CREATE TABLE IF NOT EXISTS repositories (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    default_branch VARCHAR(255) NOT NULL DEFAULT 'main',
    parent_repository_id INT REFERENCES repositories(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_owner_repo_name UNIQUE (owner_id, name)
);

CREATE TABLE IF NOT EXISTS repository_collaborators (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(255) NOT NULL,
    CONSTRAINT unique_repo_collaborator UNIQUE (repository_id, user_id)
);

CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    parent_team_id INT REFERENCES teams(id) ON DELETE CASCADE,

    CONSTRAINT unique_team_name UNIQUE(repository_id, name)
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('branch', 'folder')),
    target_identifier TEXT NOT NULL,
    allow_write BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_team_permission UNIQUE (repository_id, team_id, target_type, target_identifier)
);

CREATE TABLE IF NOT EXISTS commits (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha BYTEA NOT NULL,
    content BYTEA NOT NULL,
    root_tree_sha BYTEA,
    author_name BYTEA,
    author_date TIMESTAMPTZ,
    message BYTEA,
    PRIMARY KEY (repo_id, sha)
);

CREATE TABLE IF NOT EXISTS blobs (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha BYTEA NOT NULL,
    content BYTEA NOT NULL,
    size BIGINT NOT NULL,
    PRIMARY KEY (repo_id, sha)
);

CREATE TABLE IF NOT EXISTS tags (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha BYTEA NOT NULL,
    content BYTEA NOT NULL,
    PRIMARY KEY (repo_id, sha)
);

CREATE TABLE IF NOT EXISTS tree_entries (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    tree_sha BYTEA NOT NULL,
    name BYTEA NOT NULL,
    mode INT NOT NULL,
    sha BYTEA NOT NULL,
    PRIMARY KEY (repo_id, tree_sha, name)
);

CREATE TABLE IF NOT EXISTS refs (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name BYTEA NOT NULL,
    value BYTEA NOT NULL,
    PRIMARY KEY (repo_id, name)
);

CREATE TABLE IF NOT EXISTS commit_parent (
    repo_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_sha BYTEA NOT NULL,
    parent_sha BYTEA NOT NULL,
    parent_index INT NOT NULL,
    PRIMARY KEY (repo_id, commit_sha, parent_index),
    FOREIGN KEY (repo_id, commit_sha)
        REFERENCES commits(repo_id, sha) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (repo_id, parent_sha)
        REFERENCES commits(repo_id, sha) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS issues(
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    closed_by_id INT REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    number INT NOT NULL,
    state VARCHAR(20) NOT NULL DEFAULT 'open' CONSTRAINT issues_state_chk CHECK (state IN ('open', 'closed')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6b7280'
        CHECK (color ~* '^#[0-9a-f]{6}$'),
    CONSTRAINT unique_label_name UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS issue_comments (
    id SERIAL PRIMARY KEY,
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pull_requests (
    id SERIAL PRIMARY KEY,
    repository_id INT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    body TEXT,
    state VARCHAR(20) NOT NULL DEFAULT 'open'
        CONSTRAINT pull_requests_state_chk CHECK (state IN ('open', 'closed')),
    source_branch VARCHAR(255) NOT NULL,
    target_branch VARCHAR(255) NOT NULL,
    source_repository_id INT REFERENCES repositories(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pr_reviews (
    id SERIAL PRIMARY KEY,
    pull_request_id INT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    reviewer_id INT REFERENCES users(id) ON DELETE SET NULL,
    decision TEXT NOT NULL,
    body TEXT,
    reviewed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stars (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    repository_id INT REFERENCES repositories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, repository_id)
);

CREATE TABLE IF NOT EXISTS issue_assignees (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT issue_assignees_pkey PRIMARY KEY (issue_id, user_id)
);

CREATE TABLE IF NOT EXISTS issue_labels (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id INT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    CONSTRAINT issue_labels_pkey PRIMARY KEY (issue_id, label_id)
);

CREATE TABLE IF NOT EXISTS issue_pull_requests (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    pull_request_id INT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    CONSTRAINT issue_pull_requests_pkey PRIMARY KEY (issue_id, pull_request_id)
);
