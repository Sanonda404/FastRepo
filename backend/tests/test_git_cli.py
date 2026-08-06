import asyncio
import os
import subprocess
from pathlib import Path

import asyncpg
import httpx
import pytest

from services.database import DATABASE_URL

TMP_DIR = Path("./tmp/git_tests").resolve()

SERVER_URL = os.getenv("TEST_SERVER_URL", "http://127.0.0.1:8000")

def run_git(repo_dir: Path, *args) -> subprocess.CompletedProcess:
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    return subprocess.run(
        ["git", "-C", str(repo_dir), *args],
        capture_output=True,
        text=True,
        env=env,
    )


def _run_async(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def seed_repo(username: str, repo_name: str) -> int:
    """Create a user + repo with a HEAD symref pointing at master. Return repo_id."""

    async def _seed():
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            # Later replace with crud apis
            user_id = await conn.fetchval(
                "INSERT INTO users (username, email, password_hash) "
                "VALUES ($1, $2, $3) RETURNING id",
                username,
                f"{username}@test.com",
                "x",
            )
            repo_id = await conn.fetchval(
                "INSERT INTO repositories (owner_id, name) VALUES ($1, $2) RETURNING id",
                user_id,
                repo_name,
            )
            await conn.execute(
                "INSERT INTO refs (repo_id, name, value) VALUES ($1, $2, $3)",
                repo_id,
                b"HEAD",
                b"ref: refs/heads/master",
            )
            return repo_id
        finally:
            await conn.close()

    return _run_async(_seed())


def cleanup_repo(username: str, repo_name: str) -> None:
    async def _cleanup():
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            await conn.execute("DELETE FROM repositories WHERE name = $1", repo_name)
            await conn.execute("DELETE FROM users WHERE username = $1", username)
        finally:
            await conn.close()

    _run_async(_cleanup())


def fetch_ref(repo_id: int, ref_name: str) -> str | None:
    async def _fetch():
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            row = await conn.fetchrow(
                "SELECT value FROM refs WHERE repo_id = $1 AND name = $2",
                repo_id,
                ref_name.encode(),
            )
            return row["value"].decode() if row else None
        finally:
            await conn.close()

    return _run_async(_fetch())


def count_rows(repo_id: int, table: str) -> int:
    async def _count():
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            return await conn.fetchval(
                f"SELECT count(*) FROM {table} WHERE repo_id = $1", repo_id
            )
        finally:
            await conn.close()

    return _run_async(_count())


@pytest.fixture
def server_url():
    return SERVER_URL


@pytest.fixture
def client(server_url):
    """HTTP client for endpoint-level checks."""
    return httpx.Client(base_url=server_url)


@pytest.fixture
def repo(server_url):
    unique = f"it_{int(__import__('time').time() * 1000) % 10**7}_{os.getpid()}"
    username = unique
    repo_name = unique
    repo_id = seed_repo(username, repo_name)
    yield {"username": username, "name": repo_name, "id": repo_id,
           "url": f"{server_url}/{username}/{repo_name}"}
    cleanup_repo(username, repo_name)


def make_commit(repo_dir: Path, filename: str, content: str, message: str) -> str:
    run_git(repo_dir, "config", "user.name", "Test User")
    run_git(repo_dir, "config", "user.email", "test@example.com")
    file_path = repo_dir / filename
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content)
    run_git(repo_dir, "add", filename)
    result = run_git(repo_dir, "commit", "--allow-empty", "-m", message)
    assert result.returncode == 0, f"Commit failed: {result.stderr}"
    return run_git(repo_dir, "rev-parse", "HEAD").stdout.strip()


class TestGitCliHTTP:
    """End-to-end git CLI usage against the asyncpg-backed HTTP server."""

    def test_clone_and_push_initial_commit(self, repo):
        TMP_DIR.mkdir(parents=True, exist_ok=True)
        clone_dir = TMP_DIR / f"clone_{repo['name']}"
        result = subprocess.run(
            ["git", "clone", repo["url"], str(clone_dir)],
            capture_output=True,
            text=True,
            env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
        )
        assert result.returncode == 0, result.stderr
        assert run_git(clone_dir, "symbolic-ref", "--short", "HEAD").stdout.strip() == "master"

        head = make_commit(clone_dir, "README.md", "# Test\n", "Initial commit")
        push = subprocess.run(
            ["git", "-C", str(clone_dir), "push", "origin", "master"],
            capture_output=True,
            text=True,
            env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
        )
        assert push.returncode == 0, push.stderr

        assert fetch_ref(repo["id"], "refs/heads/master") == head
        assert count_rows(repo["id"], "commits") >= 1
        assert count_rows(repo["id"], "blobs") >= 1
        assert count_rows(repo["id"], "tree_entries") >= 1

    def test_non_fast_forward_push_rejected(self, repo):
        clone1 = TMP_DIR / f"clone1_{repo['name']}"
        env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
        subprocess.run(["git", "clone", repo["url"], str(clone1)],
                       capture_output=True, text=True, env=env)
        make_commit(clone1, "a.txt", "a", "commit a")
        push1 = subprocess.run(["git", "-C", str(clone1), "push", "origin", "master"],
                               capture_output=True, text=True, env=env)
        assert push1.returncode == 0

        clone2 = TMP_DIR / f"clone2_{repo['name']}"
        result2 = subprocess.run(["git", "clone", repo["url"], str(clone2)],
                                 capture_output=True, text=True, env=env)
        assert result2.returncode == 0
        make_commit(clone2, "b.txt", "b", "commit b")
        push2 = subprocess.run(["git", "-C", str(clone2), "push", "origin", "master"],
                               capture_output=True, text=True, env=env)
        assert push2.returncode == 0
        head2 = fetch_ref(repo["id"], "refs/heads/master")
        assert head2 is not None

        make_commit(clone1, "c.txt", "c", "commit c")
        stale_push = subprocess.run(["git", "-C", str(clone1), "push", "origin", "master"],
                                    capture_output=True, text=True, env=env)
        assert stale_push.returncode != 0, "Stale push should fail"
        assert fetch_ref(repo["id"], "refs/heads/master") == head2

    def test_branch_push_and_delete(self, repo):
        clone = TMP_DIR / f"cloneb_{repo['name']}"
        env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
        result = subprocess.run(["git", "clone", repo["url"], str(clone)],
                                capture_output=True, text=True, env=env)
        assert result.returncode == 0

        run_git(clone, "checkout", "-b", "feature")
        head = make_commit(clone, "feat.txt", "feat", "Feature commit")
        pushed = subprocess.run(["git", "-C", str(clone), "push", "origin", "feature"],
                                capture_output=True, text=True, env=env)
        assert pushed.returncode == 0, pushed.stderr
        assert fetch_ref(repo["id"], "refs/heads/feature") == head

        deleted = subprocess.run(["git", "-C", str(clone), "push", "origin", "--delete", "feature"],
                                 capture_output=True, text=True, env=env)
        assert deleted.returncode == 0
        assert fetch_ref(repo["id"], "refs/heads/feature") is None

    def test_force_push_overwrites(self, repo):
        clone = TMP_DIR / f"clonef_{repo['name']}"
        env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
        subprocess.run(["git", "clone", repo["url"], str(clone)],
                       capture_output=True, text=True, env=env)
        make_commit(clone, "f1.txt", "f1", "First")
        push = subprocess.run(["git", "-C", str(clone), "push", "origin", "master"],
                              capture_output=True, text=True, env=env)
        assert push.returncode == 0
        first = fetch_ref(repo["id"], "refs/heads/master")

        run_git(clone, "reset", "--hard", "HEAD~1")
        new_head = make_commit(clone, "f2.txt", "f2", "Rewritten")
        force_push = subprocess.run(["git", "-C", str(clone), "push", "--force", "origin", "master"],
                                    capture_output=True, text=True, env=env)
        assert force_push.returncode == 0, force_push.stderr
        ref = fetch_ref(repo["id"], "refs/heads/master")
        assert ref == new_head
        # history re write
        assert ref != first

    def test_tag_push(self, repo):
        clone = TMP_DIR / f"clonet_{repo['name']}"
        env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
        subprocess.run(["git", "clone", repo["url"], str(clone)],
                     capture_output=True, text=True, env=env)
        make_commit(clone, "t.txt", "t", "Tagged")
        run_git(clone, "tag", "-a", "v1.0", "-m", "Version 1.0")
        tag_obj = run_git(clone, "rev-parse", "v1.0").stdout.strip()
        tagged = subprocess.run(["git", "-C", str(clone), "push", "origin", "v1.0"],
                                capture_output=True, text=True, env=env)
        assert tagged.returncode == 0, tagged.stderr
        assert fetch_ref(repo["id"], "refs/tags/v1.0") == tag_obj

    def test_fetch_and_pull_sync(self, repo):
        TMP_DIR.mkdir(parents=True, exist_ok=True)
        cl1 = TMP_DIR / f"u1_{repo['name']}"
        cl2 = TMP_DIR / f"u2_{repo['name']}"
        env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
        subprocess.run(["git", "clone", repo["url"], str(cl1)],
                       capture_output=True, text=True, env=env)
        subprocess.run(["git", "clone", repo["url"], str(cl2)],
                       capture_output=True, text=True, env=env)

        first_commit = make_commit(cl1, "u1.txt", "u1", "User 1")
        subprocess.run(["git", "-C", str(cl1), "push", "origin", "master"],
                       capture_output=True, text=True, env=env)

        pull = run_git(cl2, "pull", "origin", "master")
        assert pull.returncode == 0, pull.stderr
        assert run_git(cl2, "rev-parse", "HEAD").stdout.strip() == first_commit

    def test_advertise_refs(self, client, repo):
        resp = client.get(
            f"/{repo['username']}/{repo['name']}/info/refs",
            params={"service": "git-upload-pack"},
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("application/x-git-upload-pack-advertisement")
        assert b"# service=git-upload-pack" in resp.content

        bad = client.get(
            f"/{repo['username']}/{repo['name']}/info/refs",
            params={"service": "git-receive-pack"},
        )
        assert bad.status_code == 200

    def test_missing_repo_404(self, client, repo):
        r = client.get("/fake/naai/info/refs", params={"service": "git-upload-pack"})
        assert r.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
