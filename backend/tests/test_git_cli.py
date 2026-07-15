import os
import shutil
import subprocess
from pathlib import Path

from dotenv import load_dotenv

import pytest
from fastapi.testclient import TestClient

from src.app import app

load_dotenv()

# Test directories
REPOS_DIR = Path(os.getenv("REPOSITORY_ROOT", "./repositories")).resolve()
TMP_DIR = Path("./tmp").resolve()

# Test constants
TEST_USER = "testuser"
TEST_REPO = "testrepo"
TEST_REPO_URL = f"http://localhost:8000/{TEST_USER}/{TEST_REPO}"
DEFAULT_BRANCH = "master"


def get_test_repo_path(username: str = TEST_USER, repo: str = TEST_REPO) -> Path:
    repo_name = repo if repo.endswith(".git") else f"{repo}.git"
    return REPOS_DIR / username / repo_name


def init_repo(path: Path):
    """Initialize a bare repo on path"""
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "init", "--bare", str(path)], check=True)
    subprocess.run(
        ["git", "--git-dir", str(path), "symbolic-ref", "HEAD", f"refs/heads/{DEFAULT_BRANCH}"],
        check=True,
    )


@pytest.fixture(scope="session", autouse=True)
def setup_teardown():
    """Session-wide setup and teardown."""
    # Clean up any existing test directories
    if REPOS_DIR.exists():
        shutil.rmtree(REPOS_DIR)
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)
    REPOS_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    init_repo(get_test_repo_path())

    yield

    # Teardown
    if REPOS_DIR.exists():
        shutil.rmtree(REPOS_DIR)
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)


@pytest.fixture(scope="session")
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture(scope="session")
def server_repo_path():
    """Path to the server-side repository."""
    return get_test_repo_path()

@pytest.fixture(scope="session")
def user_repo_dir():
    """User's local clone directory."""
    return TMP_DIR / TEST_USER / TEST_REPO

@pytest.fixture(scope="session", autouse=True)
def user_repo(user_repo_dir, server_repo_path):
    """Clone the server repo to user's directory using git CLI."""
    # Clone the bare repo
    result = subprocess.run(
        ["git", "clone", str(server_repo_path), str(user_repo_dir)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"Clone failed: {result.stderr}"

    # Configure git user
    subprocess.run(
        ["git", "-C", str(user_repo_dir), "config", "user.name", "Test User"],
        check=True,
    )
    subprocess.run(
        ["git", "-C", str(user_repo_dir), "config", "user.email", "test@example.com"],
        check=True,
    )

    yield user_repo_dir


def run_git(repo_dir: Path, *args, **kwargs):
    """Run git command in repo directory."""
    is_bare_repo = (
        repo_dir.is_dir()
        and (repo_dir / "HEAD").is_file()
        and (repo_dir / "objects").is_dir()
        and not (repo_dir / ".git").exists()
    )
    git_target = ["--git-dir", str(repo_dir)] if is_bare_repo else ["-C", str(repo_dir)]
    result = subprocess.run(
        ["git", *git_target, *args],
        capture_output=True,
        text=True,
        **kwargs,
    )
    return result


def ensure_git_identity(repo_dir: Path):
    name_result = run_git(repo_dir, "config", "user.name")
    if name_result.returncode != 0 or not name_result.stdout.strip():
        run_git(repo_dir, "config", "user.name", "Test User")

    email_result = run_git(repo_dir, "config", "user.email")
    if email_result.returncode != 0 or not email_result.stdout.strip():
        run_git(repo_dir, "config", "user.email", "test@example.com")


def get_commit_hash(repo_dir: Path, ref="HEAD") -> str:
    """Get commit hash for a ref."""
    result = run_git(repo_dir, "rev-parse", ref)
    assert result.returncode == 0, f"Failed to get commit hash: {result.stderr}"
    return result.stdout.strip()


def get_refs(repo_dir: Path) -> dict:
    """Get all refs in the repository."""
    result = run_git(repo_dir, "for-each-ref", "--format=%(refname) %(objectname)")
    assert result.returncode == 0
    refs = {}
    for line in result.stdout.strip().split("\n"):
        if line:
            ref, sha = line.split(" ", 1)
            refs[ref] = sha
    return refs


def create_commit(repo_dir: Path, filename: str, content: str, message: str) -> str:
    """Create a file, commit it, and return the commit hash."""
    ensure_git_identity(repo_dir)
    file_path = repo_dir / filename
    file_path.write_text(content)
    run_git(repo_dir, "add", filename)
    result = run_git(repo_dir, "commit", "--allow-empty", "-m", message)
    assert result.returncode == 0, f"Commit failed: {result.stderr}"
    return get_commit_hash(repo_dir)


class TestGitServer:
    """End-to-end tests for the git server."""

    def test_initial_clone_creates_empty_repo(self, user_repo_dir, server_repo_path):
        """Test that initial clone creates an empty repository."""
        # Server repo should be bare
        assert (server_repo_path / "HEAD").exists()
        assert (server_repo_path / "objects").exists()
        assert (server_repo_path / "refs").exists()

        # User clone should point HEAD at the default branch
        head_result = run_git(user_repo_dir, "symbolic-ref", "--short", "HEAD")
        assert head_result.returncode == 0
        assert head_result.stdout.strip() == DEFAULT_BRANCH

    def test_push_initial_commit(self, user_repo_dir, server_repo_path):
        """Test pushing initial commit to empty server repo."""
        # Create initial commit
        commit_hash = create_commit(
            user_repo_dir, "README.md", "# Test Repo\n", "Initial commit"
        )

        # Push to server
        result = run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)
        assert result.returncode == 0, f"Push failed: {result.stderr}"

        # Verify server has the commit
        server_refs = get_refs(server_repo_path)
        assert f"refs/heads/{DEFAULT_BRANCH}" in server_refs
        assert server_refs[f"refs/heads/{DEFAULT_BRANCH}"] == commit_hash

    def test_multiple_commits_push(self, user_repo_dir, server_repo_path):
        """Test pushing multiple commits."""
        # Create multiple commits
        create_commit(user_repo_dir, "file1.txt", "content1", "Add file1")
        commit2 = create_commit(user_repo_dir, "file2.txt", "content2", "Add file2")
        commit3 = create_commit(user_repo_dir, "file3.txt", "content3", "Add file3")

        # Push all commits
        result = run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)
        assert result.returncode == 0, f"Push failed: {result.stderr}"

        # Verify server has all commits
        server_refs = get_refs(server_repo_path)
        assert server_refs[f"refs/heads/{DEFAULT_BRANCH}"] == commit3

        # Verify all objects exist on server
        for commit in [commit2, commit3]:
            result = run_git(server_repo_path, "cat-file", "-t", commit)
            assert result.returncode == 0, f"Commit {commit} not found on server"

    def test_create_branch_and_push(self, user_repo_dir, server_repo_path):
        """Test creating a branch locally and pushing it."""
        # Create and switch to new branch
        run_git(user_repo_dir, "checkout", "-b", "feature-branch")
        commit_hash = create_commit(
            user_repo_dir, "feature.txt", "feature work", "Add feature"
        )

        # Push new branch
        result = run_git(user_repo_dir, "push", "origin", "feature-branch")
        assert result.returncode == 0, f"Push failed: {result.stderr}"

        # Verify branch exists on server
        server_refs = get_refs(server_repo_path)
        assert "refs/heads/feature-branch" in server_refs
        assert server_refs["refs/heads/feature-branch"] == commit_hash

    def test_merge_branch(self, user_repo_dir, server_repo_path):
        """Test merging a feature branch into master."""
        # Ensure we're on master
        run_git(user_repo_dir, "checkout", DEFAULT_BRANCH)

        # Create feature branch with commits
        run_git(user_repo_dir, "checkout", "-b", "merge-feature")
        create_commit(user_repo_dir, "merge1.txt", "merge content 1", "Merge commit 1")
        create_commit(user_repo_dir, "merge2.txt", "merge content 2", "Merge commit 2")
        feature_head = get_commit_hash(user_repo_dir)

        # Push feature branch
        run_git(user_repo_dir, "push", "origin", "merge-feature")

        # Merge into master
        run_git(user_repo_dir, "checkout", DEFAULT_BRANCH)
        result = run_git(user_repo_dir, "merge", "merge-feature")
        assert result.returncode == 0, f"Merge failed: {result.stderr}"

        merge_commit = get_commit_hash(user_repo_dir)

        # Push merged master
        result = run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)
        assert result.returncode == 0, f"Push failed: {result.stderr}"

        # Verify server master has merge commit
        server_refs = get_refs(server_repo_path)
        assert server_refs[f"refs/heads/{DEFAULT_BRANCH}"] == merge_commit

        # Verify feature branch still exists on server
        assert "refs/heads/merge-feature" in server_refs
        assert server_refs["refs/heads/merge-feature"] == feature_head

    def test_rebase_branch(self, user_repo_dir, server_repo_path):
        """Test rebasing a branch onto master."""
        # Ensure master has some commits
        run_git(user_repo_dir, "checkout", DEFAULT_BRANCH)
        create_commit(user_repo_dir, "master1.txt", "master 1", "Master commit 1")
        run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)
        master_before = get_commit_hash(user_repo_dir)

        # Create feature branch from older master
        run_git(user_repo_dir, "checkout", "-b", "rebase-feature", f"{DEFAULT_BRANCH}~1")
        create_commit(user_repo_dir, "rebase1.txt", "rebase 1", "Rebase commit 1")
        create_commit(user_repo_dir, "rebase2.txt", "rebase 2", "Rebase commit 2")
        feature_head = get_commit_hash(user_repo_dir)

        # Rebase onto master
        run_git(user_repo_dir, "rebase", DEFAULT_BRANCH)
        rebased_head = get_commit_hash(user_repo_dir)

        # Verify rebase changed commit hashes
        assert rebased_head != feature_head

        # Force push rebased branch
        result = run_git(user_repo_dir, "push", "origin", "rebase-feature", "--force")
        assert result.returncode == 0, f"Force push failed: {result.stderr}"

        # Verify server has rebased commits
        server_refs = get_refs(server_repo_path)
        assert server_refs["refs/heads/rebase-feature"] == rebased_head

    def test_fetch_and_pull(self, user_repo_dir, server_repo_path):
        """Test fetching and pulling from server."""
        # Make a change directly on server (simulate another user pushing)
        server_repo = server_repo_path
        # Create a commit directly on server
        worktree_dir = TMP_DIR / "server_worktree"
        run_git(server_repo, "worktree", "add", str(worktree_dir), DEFAULT_BRANCH)
        create_commit(worktree_dir, "server_file.txt", "server content", "Server commit")
        run_git(worktree_dir, "push", "origin", DEFAULT_BRANCH)
        server_commit = get_commit_hash(worktree_dir)
        run_git(server_repo, "worktree", "remove", str(worktree_dir))

        # User fetches
        result = run_git(user_repo_dir, "fetch", "origin")
        assert result.returncode == 0

        # User pulls
        result = run_git(user_repo_dir, "pull", "origin", DEFAULT_BRANCH)
        assert result.returncode == 0

        # Verify user has server's commit
        user_refs = get_refs(user_repo_dir)
        assert user_refs[f"refs/heads/{DEFAULT_BRANCH}"] == server_commit

    def test_delete_remote_branch(self, user_repo_dir, server_repo_path):
        """Test deleting a remote branch."""
        # Create and push a branch to delete
        run_git(user_repo_dir, "checkout", "-b", "to-delete")
        create_commit(user_repo_dir, "delete_me.txt", "delete", "To delete")
        run_git(user_repo_dir, "push", "origin", "to-delete")

        # Verify branch exists on server
        server_refs = get_refs(server_repo_path)
        assert "refs/heads/to-delete" in server_refs

        # Delete remote branch
        result = run_git(user_repo_dir, "push", "origin", "--delete", "to-delete")
        assert result.returncode == 0

        # Verify branch is gone from server
        server_refs = get_refs(server_repo_path)
        assert "refs/heads/to-delete" not in server_refs

    def test_tag_push_and_fetch(self, user_repo_dir, server_repo_path):
        """Test pushing and fetching tags."""
        # Create a tag
        run_git(user_repo_dir, "checkout", DEFAULT_BRANCH)
        commit_hash = get_commit_hash(user_repo_dir)
        run_git(user_repo_dir, "tag", "v1.0.0", commit_hash)

        # Push tag
        result = run_git(user_repo_dir, "push", "origin", "v1.0.0")
        assert result.returncode == 0

        # Verify tag on server
        server_refs = get_refs(server_repo_path)
        assert "refs/tags/v1.0.0" in server_refs
        assert server_refs["refs/tags/v1.0.0"] == commit_hash

    def test_push_all_branches(self, user_repo_dir, server_repo_path):
        """Test pushing all branches at once."""
        # Create multiple branches
        for i in range(3):
            run_git(user_repo_dir, "checkout", "-b", f"branch-{i}")
            create_commit(user_repo_dir, f"file{i}.txt", f"content{i}", f"Branch {i}")

        run_git(user_repo_dir, "checkout", DEFAULT_BRANCH)

        # Push all branches
        result = run_git(user_repo_dir, "push", "origin", "--all")
        assert result.returncode == 0

        # Verify all branches on server
        server_refs = get_refs(server_repo_path)
        for i in range(3):
            assert f"refs/heads/branch-{i}" in server_refs

    def test_force_push_overwrites_history(self, user_repo_dir, server_repo_path):
        """Test force push overwrites remote history."""
        # Push initial commit
        run_git(user_repo_dir, "checkout", DEFAULT_BRANCH)
        create_commit(user_repo_dir, "original.txt", "original", "Original")
        run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)
        original_hash = get_commit_hash(user_repo_dir)

        # Reset to previous commit (simulate history rewrite)
        run_git(user_repo_dir, "reset", "--hard", "HEAD~1")

        # Make different commit
        new_hash = create_commit(user_repo_dir, "new.txt", "new", "New commit")

        # Force push
        result = run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH, "--force")
        assert result.returncode == 0

        # Verify server has new history
        server_refs = get_refs(server_repo_path)
        assert server_refs[f"refs/heads/{DEFAULT_BRANCH}"] == new_hash
        assert server_refs[f"refs/heads/{DEFAULT_BRANCH}"] != original_hash

    def test_clone_from_server_via_http(self, client, user_repo_dir):
        """Test that server HTTP endpoints work for git operations."""
        # Test info/refs endpoint
        response = client.get(
            f"/{TEST_USER}/{TEST_REPO}/info/refs",
            params={"service": "git-upload-pack"},
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/x-git-upload-pack-advertisement"

        # Test receive-pack endpoint
        response = client.get(
            f"/{TEST_USER}/{TEST_REPO}/info/refs",
            params={"service": "git-receive-pack"},
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/x-git-receive-pack-advertisement"

    def test_server_repo_consistency_after_operations(self, user_repo_dir, server_repo_path):
        """Verify server repo is consistent after various operations."""
        # Perform a series of operations
        run_git(user_repo_dir, "checkout", DEFAULT_BRANCH)

        # 1. Multiple commits
        commits = []
        for i in range(5):
            h = create_commit(user_repo_dir, f"file{i}.txt", f"content{i}", f"Commit {i}")
            commits.append(h)

        run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)

        # 2. Create branch, commit, merge
        run_git(user_repo_dir, "checkout", "-b", "consistency-feature")
        feat_commit = create_commit(user_repo_dir, "feature.txt", "feat", "Feature")
        run_git(user_repo_dir, "push", "origin", "consistency-feature")
        run_git(user_repo_dir, "checkout", DEFAULT_BRANCH)
        run_git(user_repo_dir, "merge", "consistency-feature")
        merge_commit = get_commit_hash(user_repo_dir)
        run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)

        # 3. Create another branch, rebase
        run_git(user_repo_dir, "checkout", "-b", "rebase-branch", f"{DEFAULT_BRANCH}~2")
        rebase_commit = create_commit(user_repo_dir, "rebase.txt", "rebase", "Rebase")
        run_git(user_repo_dir, "rebase", DEFAULT_BRANCH)
        rebased_hash = get_commit_hash(user_repo_dir)
        run_git(user_repo_dir, "push", "origin", "rebase-branch", "--force")

        # Verify all objects exist on server
        for commit in commits + [feat_commit, merge_commit, rebased_hash]:
            result = run_git(server_repo_path, "cat-file", "-t", commit)
            assert result.returncode == 0, f"Commit {commit} missing on server"

        # Verify refs match
        user_refs = get_refs(user_repo_dir)
        server_refs = get_refs(server_repo_path)

        # Master should match
        assert user_refs.get(f"refs/heads/{DEFAULT_BRANCH}") == server_refs.get(
            f"refs/heads/{DEFAULT_BRANCH}"
        )

        # Branches that were pushed should match
        for ref in ["refs/heads/consistency-feature", "refs/heads/rebase-branch"]:
            if ref in user_refs:
                assert user_refs[ref] == server_refs[ref], f"Ref {ref} mismatch"

        # Verify repository integrity
        result = run_git(server_repo_path, "fsck", "--full")
        assert result.returncode == 0, f"Server repo fsck failed: {result.stderr}"

    def test_empty_repo_clone_and_push(self):
        """Test cloning an empty repo and pushing first commit."""
        # Create a fresh empty repo on server
        empty_repo_path = REPOS_DIR / "emptyuser" / "emptyrepo"
        empty_repo_path.parent.mkdir(parents=True, exist_ok=True)
        init_repo(empty_repo_path)

        # Clone to user dir
        user_empty_dir = TMP_DIR / "emptyuser" / "emptyrepo"
        result = subprocess.run(
            ["git", "clone", str(empty_repo_path), str(user_empty_dir)],
            capture_output=True,
            text=True,
        )
        # Git warns about empty repo but succeeds
        assert result.returncode == 0

        # Configure user
        subprocess.run(
            ["git", "-C", str(user_empty_dir), "config", "user.name", "Test"],
            check=True,
        )
        subprocess.run(
            ["git", "-C", str(user_empty_dir), "config", "user.email", "test@test.com"],
            check=True,
        )

        # Create initial commit on master
        create_commit(user_empty_dir, "first.txt", "first", "First commit")

        # Push to empty repo (need to set upstream)
        result = run_git(user_empty_dir, "push", "origin", DEFAULT_BRANCH)
        assert result.returncode == 0

        # Verify server has the commit
        server_refs = get_refs(empty_repo_path)
        assert f"refs/heads/{DEFAULT_BRANCH}" in server_refs

    def test_concurrent_pushes_simulated(self, user_repo_dir, server_repo_path):
        """Test handling of concurrent push scenarios."""
        # Simulate two users pushing to same branch
        # User 1 (current user) makes changes
        run_git(user_repo_dir, "checkout", DEFAULT_BRANCH)
        create_commit(user_repo_dir, "user1.txt", "user1", "User 1 commit")
        run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)
        user1_head = get_commit_hash(user_repo_dir)

        # Simulate User 2 pushing directly to server
        worktree_dir = TMP_DIR / "user2_worktree"
        run_git(server_repo_path, "worktree", "add", str(worktree_dir), DEFAULT_BRANCH)
        create_commit(worktree_dir, "user2.txt", "user2", "User 2 commit")
        run_git(worktree_dir, "push", "origin", DEFAULT_BRANCH)
        user2_head = get_commit_hash(worktree_dir)
        run_git(server_repo_path, "worktree", "remove", str(worktree_dir))

        # User 1 tries to push again (should fail without force)
        create_commit(user_repo_dir, "user1b.txt", "user1b", "User 1 commit 2")
        result = run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)
        # Should fail because remote has new commits
        assert result.returncode != 0

        # User 1 pulls and merges
        result = run_git(user_repo_dir, "pull", "--no-rebase", "origin", DEFAULT_BRANCH)
        assert result.returncode == 0

        # Now push should work
        result = run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)
        assert result.returncode == 0

        # Verify final state
        server_refs = get_refs(server_repo_path)
        user_refs = get_refs(user_repo_dir)
        assert server_refs[f"refs/heads/{DEFAULT_BRANCH}"] == user_refs[
            f"refs/heads/{DEFAULT_BRANCH}"
        ]


class TestServerRepositoryIntegrity:
    """Tests specifically for server repository integrity."""

    def test_server_repo_is_bare(self, server_repo_path):
        """Verify server repository is bare."""
        result = run_git(server_repo_path, "rev-parse", "--is-bare-repository")
        assert result.stdout.strip() == "true"

    def test_server_repo_has_no_worktree(self, server_repo_path):
        """Verify server repo has no working tree."""
        result = run_git(server_repo_path, "rev-parse", "--git-dir")
        assert result.stdout.strip() == str(server_repo_path)

    def test_server_refs_match_pushed_refs(self, user_repo_dir, server_repo_path):
        """Verify all pushed refs exist on server with correct SHA."""
        # Push multiple branches and tags
        branches = ["branch-a", "branch-b", "branch-c"]
        for branch in branches:
            run_git(user_repo_dir, "checkout", "-b", branch)
            create_commit(user_repo_dir, f"{branch}.txt", branch, f"Commit on {branch}")
            run_git(user_repo_dir, "push", "origin", branch)

        # Create tags
        run_git(user_repo_dir, "checkout", DEFAULT_BRANCH)
        for i, commit in enumerate(["v1.0", "v2.0", "v3.0"]):
            run_git(user_repo_dir, "tag", commit, f"HEAD~{i}")

        run_git(user_repo_dir, "push", "origin", "--tags")

        # Verify all refs on server
        server_refs = get_refs(server_repo_path)
        for branch in branches:
            assert f"refs/heads/{branch}" in server_refs
        for tag in ["v1.0", "v2.0", "v3.0"]:
            assert f"refs/tags/{tag}" in server_refs

    def test_git_objects_integrity(self, user_repo_dir, server_repo_path):
        """Verify git object integrity after multiple operations."""
        # Do a bunch of operations
        for i in range(10):
            create_commit(user_repo_dir, f"file{i}.txt", f"content{i}", f"Commit {i}")
            if i % 3 == 0:
                run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)

        # Final push
        run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)

        # Verify server repo integrity
        result = run_git(server_repo_path, "fsck", "--full", "--strict")
        assert result.returncode == 0, f"Integrity check failed: {result.stderr}"

        # Verify all objects are reachable
        result = run_git(server_repo_path, "fsck", "--unreachable")
        # Should have no unreachable objects (or only expected ones like reflogs)
        assert result.returncode == 0

class TestGitCLIEdgeCases:
    """Test edge cases with git CLI operations."""

    def test_push_to_non_existent_repo_fails(self, user_repo_dir):
        """Test pushing to non-existent repo fails appropriately."""
        # Change remote URL to non-existent repo
        original_origin = run_git(
            user_repo_dir, "remote", "get-url", "origin"
        ).stdout.strip()
        try:
            run_git(user_repo_dir, "remote", "set-url", "origin", "/nonexistent/path")
            result = run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)
            assert result.returncode != 0
        finally:
            run_git(user_repo_dir, "remote", "set-url", "origin", original_origin)

    def test_fetch_from_empty_repo(self, user_repo_dir):
        """Test fetching from empty repo."""
        # Create empty bare repo
        empty_repo = TMP_DIR / "empty_bare"
        empty_repo.mkdir(parents=True)
        subprocess.run(["git", "init", "--bare", str(empty_repo)], check=True)

        # Add as remote
        run_git(user_repo_dir, "remote", "add", "empty", str(empty_repo))

        # Fetch should work but get nothing
        result = run_git(user_repo_dir, "fetch", "empty")
        assert result.returncode == 0

    def test_shallow_clone_not_supported(self, server_repo_path):
        """Test shallow clone behavior."""
        shallow_dir = TMP_DIR / "shallow_clone"
        result = subprocess.run(
            ["git", "clone", "--depth", "1", str(server_repo_path), str(shallow_dir)],
            capture_output=True,
            text=True,
        )
        # Should work but may warn
        assert result.returncode == 0 or "shallow" in result.stderr.lower()

    def test_push_with_hooks(self, user_repo_dir, server_repo_path):
        """Test that server-side hooks work if configured."""
        # Create a pre-receive hook that rejects pushes
        hooks_dir = server_repo_path / "hooks"
        hooks_dir.mkdir(exist_ok=True)
        pre_receive = hooks_dir / "pre-receive"
        pre_receive.write_text("#!/bin/sh\necho 'Rejected by hook' >&2\nexit 1\n")
        pre_receive.chmod(0o755)

        try:
            # Try to push - should be rejected
            create_commit(user_repo_dir, "hook_test.txt", "test", "Test hook")
            result = run_git(user_repo_dir, "push", "origin", DEFAULT_BRANCH)
            assert result.returncode != 0
            assert "Rejected by hook" in result.stderr
        finally:
            # Clean up hook
            pre_receive.unlink()


@pytest.fixture(autouse=True)
def reset_user_repo(user_repo_dir):
    """Reset user repo to clean state before each test."""
    yield
    # Reset to master and clean
    run_git(user_repo_dir, "checkout", DEFAULT_BRANCH, "--force")
    run_git(user_repo_dir, "reset", "--hard", f"origin/{DEFAULT_BRANCH}")
    run_git(user_repo_dir, "clean", "-fd")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
