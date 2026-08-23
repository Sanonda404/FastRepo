import asyncio
import os
import subprocess
from pathlib import Path

import asyncpg
import httpx
import pytest

from urllib.parse import urlparse, urlunparse

from services.database import DATABASE_URL

TMP_DIR = Path("/tmp/opencode/git_tests").resolve()

SERVER_URL = os.getenv("TEST_SERVER_URL", "http://127.0.0.1:8000")
GIT_PASSWORD = "testpass123"


def unique(name):
    return f"{name}_{int(__import__('time').time() * 1000) % 10**7}_{os.getpid()}"


def repo_url(server: str, username: str, repo_name: str, password: str | None = None) -> str:
    """Server URL with optional HTTP Basic credentials embedded (git sends these as auth)."""
    parts = urlparse(server)
    netloc = f"{username}:{password}@{parts.netloc}" if password else parts.netloc
    return urlunparse((parts.scheme, netloc, f"/{username}/{repo_name}", "", "", ""))

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


def seed_repo(username: str, repo_name: str, password: str = GIT_PASSWORD) -> int:
    """Create user + repo through the public API. Return repo_id."""
    with httpx.Client(base_url=SERVER_URL+"/api") as client:
        reg = client.post(
            "/users/register",
            json={"username": username, "email": f"{username}@test.com", "password": password},
        )
        assert reg.status_code == 201, reg.text
        login = client.post(
            "/users/login",
            data={"username": username, "password": password},
        )
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]
        created = client.post(
            "/repositories/create",
            json={"name": repo_name, "description": None, "is_private": False},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert created.status_code == 201, created.text
        return created.json()["id"]


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
                ref_name,
            )
            return row["value"] if row else None
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
    """HTTP client for endpoint-level checks (API mounted under /api)."""
    return httpx.Client(base_url=SERVER_URL + "/api")


@pytest.fixture
def git_client():
    """Root-level client for git smart-HTTP endpoints (served outside /api)."""
    return httpx.Client(base_url=SERVER_URL)


@pytest.fixture
def repo(server_url):
    unique = f"it_{int(__import__('time').time() * 1000) % 10**7}_{os.getpid()}"
    username = unique
    repo_name = unique
    repo_id = seed_repo(username, repo_name)
    yield {"username": username, "name": repo_name, "id": repo_id,
           "url": repo_url(server_url, username, repo_name, GIT_PASSWORD)}
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
        assert run_git(clone_dir, "symbolic-ref", "--short", "HEAD").stdout.strip() == "main"

        head = make_commit(clone_dir, "README.md", "# Test\n", "Initial commit")
        push = subprocess.run(
            ["git", "-C", str(clone_dir), "push", "origin", "main"],
            capture_output=True,
            text=True,
            env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
        )
        assert push.returncode == 0, push.stderr

        assert fetch_ref(repo["id"], "refs/heads/main") == head
        assert count_rows(repo["id"], "commits") >= 1
        assert count_rows(repo["id"], "blobs") >= 1
        assert count_rows(repo["id"], "tree_entries") >= 1

    def test_new_repo_has_creation_commit(self, repo):
        TMP_DIR.mkdir(parents=True, exist_ok=True)
        clone_dir = TMP_DIR / f"clone_init_{repo['name']}"
        result = subprocess.run(
            ["git", "clone", repo["url"], str(clone_dir)],
            capture_output=True,
            text=True,
            env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
        )
        assert result.returncode == 0, result.stderr

        ident = run_git(
            clone_dir, "log", "-1", "--format=%an|%ae|%cn|%ce|%s"
        ).stdout.strip()
        expected = f"{repo['username']}|{repo['username']}@test.com|" \
                   f"{repo['username']}|{repo['username']}@test.com|Repository Creation"
        assert ident == expected

        count = run_git(clone_dir, "rev-list", "--count", "HEAD").stdout.strip()
        assert count == "1"

        trees = run_git(clone_dir, "ls-tree", "-r", "HEAD").stdout.strip()
        assert trees == ""

    def test_non_fast_forward_push_rejected(self, repo):
        clone1 = TMP_DIR / f"clone1_{repo['name']}"
        env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
        subprocess.run(["git", "clone", repo["url"], str(clone1)],
                       capture_output=True, text=True, env=env)
        make_commit(clone1, "a.txt", "a", "commit a")
        push1 = subprocess.run(["git", "-C", str(clone1), "push", "origin", "main"],
                               capture_output=True, text=True, env=env)
        assert push1.returncode == 0

        clone2 = TMP_DIR / f"clone2_{repo['name']}"
        result2 = subprocess.run(["git", "clone", repo["url"], str(clone2)],
                                 capture_output=True, text=True, env=env)
        assert result2.returncode == 0
        make_commit(clone2, "b.txt", "b", "commit b")
        push2 = subprocess.run(["git", "-C", str(clone2), "push", "origin", "main"],
                               capture_output=True, text=True, env=env)
        assert push2.returncode == 0
        head2 = fetch_ref(repo["id"], "refs/heads/main")
        assert head2 is not None

        make_commit(clone1, "c.txt", "c", "commit c")
        stale_push = subprocess.run(["git", "-C", str(clone1), "push", "origin", "main"],
                                    capture_output=True, text=True, env=env)
        assert stale_push.returncode != 0, "Stale push should fail"
        assert fetch_ref(repo["id"], "refs/heads/main") == head2

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
        push = subprocess.run(["git", "-C", str(clone), "push", "origin", "main"],
                              capture_output=True, text=True, env=env)
        assert push.returncode == 0
        first = fetch_ref(repo["id"], "refs/heads/main")

        run_git(clone, "reset", "--hard", "HEAD~1")
        new_head = make_commit(clone, "f2.txt", "f2", "Rewritten")
        force_push = subprocess.run(["git", "-C", str(clone), "push", "--force", "origin", "main"],
                                    capture_output=True, text=True, env=env)
        assert force_push.returncode == 0, force_push.stderr
        ref = fetch_ref(repo["id"], "refs/heads/main")
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
        subprocess.run(["git", "-C", str(cl1), "push", "origin", "main"],
                       capture_output=True, text=True, env=env)

        pull = run_git(cl2, "pull", "origin", "main")
        assert pull.returncode == 0, pull.stderr
        assert run_git(cl2, "rev-parse", "HEAD").stdout.strip() == first_commit

    def test_advertise_refs(self, git_client, repo):
        resp = git_client.get(
            f"/{repo['username']}/{repo['name']}/info/refs",
            params={"service": "git-upload-pack"},
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("application/x-git-upload-pack-advertisement")
        assert b"# service=git-upload-pack" in resp.content

        bad = git_client.get(
            f"/{repo['username']}/{repo['name']}/info/refs",
            params={"service": "git-receive-pack"},
        )
        assert bad.status_code == 401, "Anonymous push must be rejected"

    def test_missing_repo_404(self, git_client, repo):
        r = git_client.get("/fake/naai/info/refs", params={"service": "git-upload-pack"})
        assert r.status_code == 404

    def test_private_repo_clone_requires_auth(self, client, server_url):
        username = unique("priv")
        repo_name = unique("priv")
        repo_id = None
        try:
            repo_id = seed_repo(username, repo_name)
            # flip to private via API
            token = client.post(
                "/users/login", data={"username": username, "password": GIT_PASSWORD}
            ).json()["access_token"]
            r = client.patch(
                f"/repositories/{username}/{repo_name}",
                json={"is_private": True},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert r.status_code == 200

            TMP_DIR.mkdir(parents=True, exist_ok=True)
            env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}

            # anonymous clone fails
            anon_dir = TMP_DIR / f"clone_anon_{repo_name}"
            anon_url = repo_url(server_url, username, repo_name)
            anon = subprocess.run(["git", "clone", anon_url, str(anon_dir)],
                                  capture_output=True, text=True, env=env)
            assert anon.returncode != 0

            # clone with credentials (owner) succeeds
            clone_dir = TMP_DIR / f"clone_{repo_name}"
            url = repo_url(server_url, username, repo_name, GIT_PASSWORD)
            ok = subprocess.run(["git", "clone", url, str(clone_dir)],
                                capture_output=True, text=True, env=env)
            assert ok.returncode == 0, ok.stderr

            # push works with credentials
            head = make_commit(clone_dir, "p.txt", "private", "Private commit")
            push = subprocess.run(["git", "-C", str(clone_dir), "push", "origin", "main"],
                                  capture_output=True, text=True, env=env)
            assert push.returncode == 0, push.stderr
            assert fetch_ref(repo_id, "refs/heads/main") == head
        finally:
            if repo_id is not None:
                cleanup_repo(username, repo_name)


class TestReadEndpoints:
    """Read endpoints: branches, history, commit detail+diff, source tree."""

    def _push_repo(self, repo):
        TMP_DIR.mkdir(parents=True, exist_ok=True)
        clone = TMP_DIR / f"read_{repo['name']}"
        result = subprocess.run(["git", "clone", repo["url"], str(clone)],
                                capture_output=True, text=True,
                                env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
        assert result.returncode == 0, result.stderr
        make_commit(clone, "README.md", "# Test\n", "Add readme")
        make_commit(clone, "src/app.py", "print('hi')\n", "Add app")
        make_commit(clone, "README.md", "# Test v2\n", "Update readme")
        push = subprocess.run(["git", "-C", str(clone), "push", "origin", "main"],
                              capture_output=True, text=True,
                              env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
        assert push.returncode == 0, push.stderr
        return clone

    def test_branches_endpoint(self, client, repo):
        self._push_repo(repo)
        r = client.get(f"/repositories/{repo['username']}/{repo['name']}/branches")
        assert r.status_code == 200
        branches = r.json()
        names = [b["name"] for b in branches]
        assert names == ["main"]
        assert len(branches[0]["sha"]) == 40
        assert isinstance(branches[0]["is_default"], bool)

    def test_commit_history(self, client, repo):
        self._push_repo(repo)
        r = client.get(f"/repositories/{repo['username']}/{repo['name']}/commits")
        assert r.status_code == 200
        commits = r.json()
        assert len(commits) == 4
        assert commits[0]["message"] == "Update readme"
        assert commits[1]["message"] == "Add app"
        assert commits[2]["message"] == "Add readme"
        assert commits[-1]["message"] == "Repository Creation"
        assert commits[-1]["author"] == repo["username"]
        assert commits[-1]["author_email"] == f"{repo['username']}@test.com"
        for c in commits[:-1]:
            assert set(c) == {"sha", "author", "author_email", "author_date", "message"}
            assert c["author"] == "Test User"
            assert c["author_date"]
        # only-requested fields: no parents/diff leak
        assert "diff" not in commits[0]

    def test_history_limit(self, client, repo):
        self._push_repo(repo)
        r = client.get(
            f"/repositories/{repo['username']}/{repo['name']}/commits", params={"limit": 2}
        )
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_commit_detail_and_diff(self, client, repo):
        self._push_repo(repo)
        base = f"/repositories/{repo['username']}/{repo['name']}"
        commits = client.get(f"{base}/commits").json()
        head = commits[0]["sha"]
        r = client.get(f"{base}/commits/{head}")
        assert r.status_code == 200
        detail = r.json()
        assert detail["sha"] == head
        assert detail["message"] == "Update readme"
        assert detail["author"] == "Test User"
        assert detail["author_email"] is None  # name not a registered username
        assert len(detail["parents"]) == 1
        assert [f["path"] for f in detail["diff"]] == ["README.md"]
        changed = detail["diff"][0]
        assert changed["status"] == "modified"
        assert changed["additions"] == 1
        assert changed["deletions"] == 1
        assert "+# Test v" in changed["diff"]

        # creation commit: root, empty tree
        root = commits[-1]["sha"]
        r2 = client.get(f"{base}/commits/{root}")
        assert r2.status_code == 200
        assert r2.json()["parents"] == []
        assert r2.json()["message"] == "Repository Creation"
        assert r2.json()["author"] == repo["username"]
        assert r2.json()["diff"] == []

    def test_commit_author_email_from_users(self, client, repo, server_url):
        clone = self._push_repo(repo)
        # make_commit re-configures user identity, so commit manually
        run_git(clone, "config", "user.name", repo["username"])
        run_git(clone, "config", "user.email", f"{repo['username']}@test.com")
        (clone / "who.txt").write_text("who")
        run_git(clone, "add", "who.txt")
        committed = run_git(clone, "commit", "-m", "Username-author commit")
        assert committed.returncode == 0, committed.stderr
        pushed = subprocess.run(["git", "-C", str(clone), "push", "origin", "main"],
                                capture_output=True, text=True,
                                env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
        assert pushed.returncode == 0, pushed.stderr
        base = f"/repositories/{repo['username']}/{repo['name']}"
        commits = client.get(f"{base}/commits").json()
        assert commits[0]["message"] == "Username-author commit"
        assert client.get(f"{base}/commits/{commits[0]['sha']}").json()["author_email"] == \
            f"{repo['username']}@test.com"

    def test_tree_endpoint(self, client, repo):
        self._push_repo(repo)
        base = f"/repositories/{repo['username']}/{repo['name']}"
        r = client.get(f"{base}/tree")
        assert r.status_code == 200
        tree = r.json()
        assert tree["path"] == ""
        by_name = {e["name"]: e for e in tree["entries"]}
        assert "README.md" in by_name
        assert "src" in by_name
        assert by_name["src"]["type"] == "tree"
        assert by_name["README.md"]["type"] == "blob"
        assert by_name["README.md"]["size"] == len("# Test v2\n")

        sub = client.get(f"{base}/tree", params={"path": "src"})
        assert sub.status_code == 200
        assert [e["name"] for e in sub.json()["entries"]] == ["app.py"]

        byref = client.get(f"{base}/tree", params={"ref": "main"})
        assert byref.status_code == 200
        assert byref.json()["tree"] == tree["tree"]

        bad = client.get(f"{base}/tree", params={"path": "nope"})
        assert bad.status_code == 404

    def test_file_endpoint(self, client, repo):
        self._push_repo(repo)
        base = f"/repositories/{repo['username']}/{repo['name']}"
        r = client.post(f"{base}/file", json={"path": "README.md"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["name"] == "README.md"
        assert body["path"] == "README.md"
        assert body["binary"] is False
        assert body["content"] == "# Test v2\n"
        assert body["size"] == len("# Test v2\n")
        assert len(body["sha"]) == 40

        nested = client.post(f"{base}/file", json={"path": "src/app.py"})
        assert nested.status_code == 200, nested.text
        assert nested.json()["content"] == "print('hi')\n"

        byref = client.post(f"{base}/file", json={"path": "README.md", "ref": "main"})
        assert byref.status_code == 200

        missing = client.post(f"{base}/file", json={"path": "nope.txt"})
        assert missing.status_code == 404

        dir_path = client.post(f"{base}/file", json={"path": "src"})
        assert dir_path.status_code == 404

    def test_private_repo_read_403_anonymous(self, client, server_url):
        username = unique("priv")
        repo_name = unique("priv")
        try:
            seed_repo(username, repo_name)
            TMP_DIR.mkdir(parents=True, exist_ok=True)
            clone_dir = TMP_DIR / f"read_priv_{repo_name}"
            url = repo_url(server_url, username, repo_name, GIT_PASSWORD)
            subprocess.run(["git", "clone", url, str(clone_dir)],
                           capture_output=True, text=True,
                           env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
            make_commit(clone_dir, "a.txt", "a", "priv")
            subprocess.run(["git", "-C", str(clone_dir), "push", "origin", "main"],
                           capture_output=True, text=True,
                           env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
            token = client.post(
                "/users/login", data={"username": username, "password": GIT_PASSWORD}
            ).json()["access_token"]
            client.patch(
                f"/repositories/{username}/{repo_name}",
                json={"is_private": True},
                headers={"Authorization": f"Bearer {token}"},
            )
            base = f"/repositories/{username}/{repo_name}"
            assert client.get(f"{base}/branches").status_code == 403
            assert client.get(f"{base}/commits").status_code == 403
            assert client.get(f"{base}/tree").status_code == 403
            hdr = {"Authorization": f"Bearer {token}"}
            assert client.get(f"{base}/branches", headers=hdr).status_code == 200
            assert client.get(f"{base}/commits", headers=hdr).status_code == 200
        finally:
            cleanup_repo(username, repo_name)
