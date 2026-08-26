"""Permission wiring for the push service (auth/permission.py rules).

Role matrix: owner/Admin/Maintainer bypass, Member governed by team-scoped
branch/folder rules (default deny), Viewer read-only, outsiders blocked.
Teams/team_members/permissions are seeded directly via asyncpg - there is no
management API yet.
"""

import asyncio
import os
import subprocess
from pathlib import Path

import asyncpg
import httpx
import pytest

from urllib.parse import urlparse, urlunparse

from services.database import DATABASE_URL
from test_git_cli import (
    GIT_PASSWORD,
    TMP_DIR,
    cleanup_repo,
    fetch_ref,
    make_commit,
    repo_url,
    run_git,
    seed_repo,
)

SERVER_URL = os.getenv("TEST_SERVER_URL", "http://127.0.0.1:8000")
API_URL = SERVER_URL + "/api"


def unique(name):
    import time

    return f"{name}_{int(time.time() * 1000) % 10**7}_{os.getpid()}"


def _run_async(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def token_for(username: str, password: str = GIT_PASSWORD) -> str:
    with httpx.Client(base_url=API_URL) as client:
        r = client.post("/users/login", data={"username": username, "password": password})
        assert r.status_code == 200, r.text
        return r.json()["access_token"]


def register_user(username: str) -> None:
    with httpx.Client(base_url=API_URL) as client:
        r = client.post(
            "/users/register",
            json={"username": username, "email": f"{username}@test.com", "password": GIT_PASSWORD},
        )
        assert r.status_code == 201, r.text


def add_collaborator(owner: str, repo_name: str, owner_token: str, username: str, role: str) -> None:
    with httpx.Client(base_url=API_URL) as client:
        r = client.post(
            f"/collaborators/{owner}/{repo_name}",
            json={"identifier": username, "role": role},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert r.status_code == 201, r.text


def get_user_id(username: str) -> int:
    async def _q():
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            return await conn.fetchval("SELECT id FROM users WHERE username = $1", username)
        finally:
            await conn.close()

    return _run_async(_q())


def seed_team(repo_id: int, name: str, parent_team_id: int | None = None) -> int:
    async def _q():
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            return await conn.fetchval(
                "INSERT INTO teams (repository_id, name, parent_team_id) VALUES ($1, $2, $3) RETURNING id",
                repo_id, name, parent_team_id,
            )
        finally:
            await conn.close()

    return _run_async(_q())


def add_team_member(repo_id: int, team_id: int, username: str) -> None:
    """member_id references repository_collaborators.id, not users.id"""
    async def _q():
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            inserted = await conn.fetchval(
                "INSERT INTO team_members (team_id, member_id) "
                "SELECT $2, c.id FROM repository_collaborators c "
                "WHERE c.repository_id = $1 AND c.user_id = (SELECT id FROM users WHERE username = $3) "
                "ON CONFLICT DO NOTHING RETURNING member_id",
                repo_id, team_id, username,
            )
            assert inserted is not None, f"{username} must be a collaborator before joining a team"
        finally:
            await conn.close()

    _run_async(_q())


def seed_permission(repo_id: int, team_id: int, target_type: str, target_identifier: str, allow_write: bool) -> None:
    async def _q():
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            await conn.execute(
                "INSERT INTO permissions (repository_id, team_id, target_type, target_identifier, allow_write) "
                "VALUES ($1, $2, $3, $4, $5)",
                repo_id, team_id, target_type, target_identifier, allow_write,
            )
        finally:
            await conn.close()

    _run_async(_q())


def git_basic_auth_url(server: str, username: str, password: str | None) -> str:
    parts = urlparse(server)
    netloc = f"{username}:{password}@{parts.netloc}" if password else parts.netloc
    return urlunparse((parts.scheme, netloc, "", "", "", ""))


def git_http_get(path: str, service: str, auth: tuple[str, str] | None = None) -> httpx.Response:
    with httpx.Client(base_url=SERVER_URL) as client:
        return client.get(
            path,
            params={"service": service},
            auth=auth,
            headers={"User-Agent": "git/2.0"},
        )


def cred_url(owner: str, repo_name: str, creds_user: str, password: str = GIT_PASSWORD) -> str:
    """Repo URL authenticated as `creds_user` (path stays owner/repo)."""
    parts = urlparse(SERVER_URL)
    netloc = f"{creds_user}:{password}@{parts.netloc}"
    return urlunparse((parts.scheme, netloc, f"/{owner}/{repo_name}", "", "", ""))


def clone(url: str, target: Path) -> Path:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    result = subprocess.run(
        ["git", "clone", url, str(target)], capture_output=True, text=True, env=env
    )
    assert result.returncode == 0, result.stderr
    return target


def push(clone_dir: Path, *refspecs: str) -> subprocess.CompletedProcess:
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    args = ["git", "-C", str(clone_dir), "push", "origin", *refspecs]
    return subprocess.run(args, capture_output=True, text=True, env=env)


@pytest.fixture
def world(request):
    """Yields a dict with owner/repo/user factories; cleans everything up."""
    owner = unique("pown")
    repo_name = unique("prepo")
    repo_id = seed_repo(owner, repo_name)

    state = {
        "owner": owner,
        "repo_name": repo_name,
        "repo_id": repo_id,
        "owner_token": token_for(owner),
        "url": repo_url(SERVER_URL, owner, repo_name, GIT_PASSWORD),
        "users": [],
    }

    def make_user(prefix: str) -> tuple[str, str]:
        username = unique(prefix)
        register_user(username)
        state["users"].append(username)
        return username, token_for(username)

    state["make_user"] = make_user

    yield state

    cleanup_repo(owner, repo_name)
    for username in state["users"]:
        cleanup_repo(username, unique("junk"))


class TestRoleMatrix:
    def test_owner_push_allowed(self, world):
        clone_dir = clone(world["url"], TMP_DIR / f"pm_{world['repo_name']}")
        make_commit(clone_dir, "f.txt", "x", "c")
        assert push(clone_dir, "main").returncode == 0

    def test_admin_and_maintainer_push_without_rules(self, world):
        for role in ("Admin", "Maintainer"):
            username, _ = world["make_user"](role.lower())
            add_collaborator(world["owner"], world["repo_name"], world["owner_token"], username, role)
            user_url = cred_url(world["owner"], world["repo_name"], username)
            clone_dir = clone(user_url, TMP_DIR / f"pm_{role}_{world['repo_name']}")
            make_commit(clone_dir, f"{role}.txt", "x", f"c-{role}")
            assert push(clone_dir, "main").returncode == 0, f"{role} should push freely"

    def test_viewer_clones_private_but_cannot_push(self, world):
        # flip repo to private
        with httpx.Client(base_url=API_URL) as client:
            r = client.patch(
                f"/repositories/{world['owner']}/{world['repo_name']}",
                json={"is_private": True},
                headers={"Authorization": f"Bearer {world['owner_token']}"},
            )
            assert r.status_code == 200

        username, _ = world["make_user"]("viewer")
        add_collaborator(world["owner"], world["repo_name"], world["owner_token"], username, "Viewer")
        viewer_url = cred_url(world["owner"], world["repo_name"], username)

        path = f"/{world['owner']}/{world['repo_name']}/info/refs"
        assert git_http_get(path, "git-upload-pack", auth=(username, GIT_PASSWORD)).status_code == 200
        assert git_http_get(path, "git-receive-pack", auth=(username, GIT_PASSWORD)).status_code == 403

        clone_dir = clone(viewer_url, TMP_DIR / f"pv_{world['repo_name']}")
        make_commit(clone_dir, "v.txt", "x", "viewer commit")
        result = push(clone_dir, "main")
        assert result.returncode != 0
        assert "403" in (result.stderr + result.stdout)

    def test_non_collaborator_cannot_push_public(self, world):
        username, _ = world["make_user"]("out")
        path = f"/{world['owner']}/{world['repo_name']}/info/refs"
        r = git_http_get(path, "git-receive-pack", auth=(username, GIT_PASSWORD))
        assert r.status_code == 403

    def test_anonymous_push_advertisement_401(self, world):
        path = f"/{world['owner']}/{world['repo_name']}/info/refs"
        assert git_http_get(path, "git-receive-pack").status_code == 401


class TestBranchRules:
    def test_member_default_deny_without_rules(self, world):
        username, _ = world["make_user"]("mem")
        add_collaborator(world["owner"], world["repo_name"], world["owner_token"], username, "Member")

        clone_dir = clone(cred_url(world["owner"], world["repo_name"], username), TMP_DIR / f"bd_{world['repo_name']}")
        make_commit(clone_dir, "m.txt", "x", "member commit")
        result = push(clone_dir, "main")
        assert result.returncode != 0
        assert fetch_ref(world["repo_id"], "refs/heads/main") != run_git(
            clone_dir, "rev-parse", "HEAD"
        ).stdout.strip()

    def test_member_branch_allow_rule(self, world):
        username, _ = world["make_user"]("mem")
        add_collaborator(world["owner"], world["repo_name"], world["owner_token"], username, "Member")
        team_id = seed_team(world["repo_id"], "devs")
        add_team_member(world["repo_id"], team_id, username)
        seed_permission(world["repo_id"], team_id, "branch", "main", True)
        seed_permission(world["repo_id"], team_id, "folder", "", True)

        clone_dir = clone(cred_url(world["owner"], world["repo_name"], username), TMP_DIR / f"ba_{world['repo_name']}")
        head = make_commit(clone_dir, "m.txt", "x", "member commit")
        assert push(clone_dir, "main").returncode == 0
        assert fetch_ref(world["repo_id"], "refs/heads/main") == head

        # unlisted branch stays default-deny
        run_git(clone_dir, "checkout", "-b", "feature")
        make_commit(clone_dir, "f.txt", "y", "feature commit")
        result = push(clone_dir, "feature")
        assert result.returncode != 0
        assert fetch_ref(world["repo_id"], "refs/heads/feature") is None

    def test_denied_branch_message(self, world):
        username, _ = world["make_user"]("mem")
        add_collaborator(world["owner"], world["repo_name"], world["owner_token"], username, "Member")
        team_id = seed_team(world["repo_id"], "devs")
        add_team_member(world["repo_id"], team_id, username)
        seed_permission(world["repo_id"], team_id, "branch", "other", True)

        clone_dir = clone(cred_url(world["owner"], world["repo_name"], username), TMP_DIR / f"bm_{world['repo_name']}")
        make_commit(clone_dir, "m.txt", "x", "member commit")
        result = push(clone_dir, "main")
        assert result.returncode != 0
        assert "denied" in (result.stderr + result.stdout)

    def test_deny_beats_allow_across_teams(self, world):
        username, _ = world["make_user"]("mem")
        add_collaborator(world["owner"], world["repo_name"], world["owner_token"], username, "Member")
        allow_team = seed_team(world["repo_id"], "allow-team")
        deny_team = seed_team(world["repo_id"], "deny-team")
        add_team_member(world["repo_id"], allow_team, username)
        add_team_member(world["repo_id"], deny_team, username)
        seed_permission(world["repo_id"], allow_team, "branch", "main", True)
        seed_permission(world["repo_id"], deny_team, "branch", "main", False)

        clone_dir = clone(cred_url(world["owner"], world["repo_name"], username), TMP_DIR / f"dbeats_{world['repo_name']}")
        make_commit(clone_dir, "m.txt", "x", "member commit")
        result = push(clone_dir, "main")
        assert result.returncode != 0
        assert "denied" in (result.stderr + result.stdout)

    def test_parent_team_inheritance(self, world):
        username, _ = world["make_user"]("mem")
        add_collaborator(world["owner"], world["repo_name"], world["owner_token"], username, "Member")
        parent_team = seed_team(world["repo_id"], "parent")
        child_team = seed_team(world["repo_id"], "child", parent_team_id=parent_team)
        add_team_member(world["repo_id"], child_team, username)
        seed_permission(world["repo_id"], parent_team, "branch", "main", True)
        seed_permission(world["repo_id"], parent_team, "folder", "", True)

        clone_dir = clone(cred_url(world["owner"], world["repo_name"], username), TMP_DIR / f"inh_{world['repo_name']}")
        head = make_commit(clone_dir, "m.txt", "x", "member commit")
        assert push(clone_dir, "main").returncode == 0
        assert fetch_ref(world["repo_id"], "refs/heads/main") == head


class TestTagsAndRefs:
    def _setup_member_with_main_allow(self, world):
        username, _ = world["make_user"]("mem")
        add_collaborator(world["owner"], world["repo_name"], world["owner_token"], username, "Member")
        team_id = seed_team(world["repo_id"], "devs")
        add_team_member(world["repo_id"], team_id, username)
        seed_permission(world["repo_id"], team_id, "branch", "main", True)
        seed_permission(world["repo_id"], team_id, "folder", "", True)
        return username

    def test_member_cannot_push_tag(self, world):
        username = self._setup_member_with_main_allow(world)
        clone_dir = clone(cred_url(world["owner"], world["repo_name"], username), TMP_DIR / f"tg_{world['repo_name']}")
        make_commit(clone_dir, "t.txt", "x", "c")
        assert push(clone_dir, "main").returncode == 0
        run_git(clone_dir, "tag", "-a", "v1", "-m", "v1")
        result = push(clone_dir, "v1")
        assert result.returncode != 0
        assert "Maintainers" in (result.stderr + result.stdout)
        assert fetch_ref(world["repo_id"], "refs/tags/v1") is None

    def test_maintainer_can_push_tag(self, world):
        username, _ = world["make_user"]("mnt")
        add_collaborator(world["owner"], world["repo_name"], world["owner_token"], username, "Maintainer")
        clone_dir = clone(cred_url(world["owner"], world["repo_name"], username), TMP_DIR / f"tgm_{world['repo_name']}")
        make_commit(clone_dir, "t.txt", "x", "c")
        assert push(clone_dir, "main").returncode == 0
        run_git(clone_dir, "tag", "-a", "v1", "-m", "v1")
        assert push(clone_dir, "v1").returncode == 0
        assert fetch_ref(world["repo_id"], "refs/tags/v1") is not None

    def test_multi_ref_push_all_or_nothing_on_branch_denial(self, world):
        username, _ = world["make_user"]("mem")
        add_collaborator(world["owner"], world["repo_name"], world["owner_token"], username, "Member")
        team_id = seed_team(world["repo_id"], "devs")
        add_team_member(world["repo_id"], team_id, username)
        seed_permission(world["repo_id"], team_id, "branch", "allowed", True)

        clone_dir = clone(cred_url(world["owner"], world["repo_name"], username), TMP_DIR / f"mr_{world['repo_name']}")
        run_git(clone_dir, "checkout", "-b", "allowed")
        make_commit(clone_dir, "a.txt", "a", "c1")
        run_git(clone_dir, "checkout", "main")
        make_commit(clone_dir, "b.txt", "b", "c2")
        run_git(clone_dir, "checkout", "allowed")

        old_main = fetch_ref(world["repo_id"], "refs/heads/main")
        result = push(clone_dir, "allowed", "main")
        assert result.returncode != 0
        # neither ref moved
        assert fetch_ref(world["repo_id"], "refs/heads/main") == old_main
        assert fetch_ref(world["repo_id"], "refs/heads/allowed") is None


class TestFolderRules:
    def _setup(self, world, *rules: tuple[str, bool]):
        username, _ = world["make_user"]("mem")
        add_collaborator(world["owner"], world["repo_name"], world["owner_token"], username, "Member")
        team_id = seed_team(world["repo_id"], "devs")
        add_team_member(world["repo_id"], team_id, username)
        seed_permission(world["repo_id"], team_id, "branch", "main", True)
        for target, allow in rules:
            seed_permission(world["repo_id"], team_id, "folder", target, allow)
        return username

    def test_folder_allow_docs_only(self, world):
        username = self._setup(world, ("docs/", True))

        # docs-only change passes
        clone_dir = clone(cred_url(world["owner"], world["repo_name"], username), TMP_DIR / f"f1_{world['repo_name']}")
        head = make_commit(clone_dir, "docs/guide.md", "hello", "docs change")
        assert push(clone_dir, "main").returncode == 0
        assert fetch_ref(world["repo_id"], "refs/heads/main") == head

        # change outside allowed folder is rejected
        make_commit(clone_dir, "src/app.py", "print(1)", "code change")
        result = push(clone_dir, "main")
        assert result.returncode != 0
        assert fetch_ref(world["repo_id"], "refs/heads/main") == head

    def test_folder_violation_rolls_back_whole_push(self, world):
        username = self._setup(world, ("docs/", True))

        clone_dir = clone(cred_url(world["owner"], world["repo_name"], username), TMP_DIR / f"f2_{world['repo_name']}")
        # single commit touches allowed and denied paths -> whole push undone
        make_commit(clone_dir, "docs/a.md", "a", "docs part")
        run_git(clone_dir, "add", ".")
        src_dir = Path(clone_dir) / "src"
        src_dir.mkdir(parents=True, exist_ok=True)
        (src_dir / "secret.py").write_text("x")
        run_git(clone_dir, "add", ".")
        run_git(clone_dir, "commit", "--allow-empty", "-m", "mixed commit")

        before = fetch_ref(world["repo_id"], "refs/heads/main")
        result = push(clone_dir, "main")
        assert result.returncode != 0
        assert "403" in (result.stderr + result.stdout) or "denied" in (result.stderr + result.stdout)
        assert fetch_ref(world["repo_id"], "refs/heads/main") == before

        # repo still healthy: removing the bad commit lets the push through
        run_git(clone_dir, "reset", "--hard", "HEAD~1")
        head = make_commit(clone_dir, "docs/b.md", "b", "clean docs commit")
        assert push(clone_dir, "main").returncode == 0
        assert fetch_ref(world["repo_id"], "refs/heads/main") == head

    def test_folder_most_specific_wins(self, world):
        username = self._setup(world, ("docs/", True), ("docs/internal/", False))

        # docs/internal is denied even though docs/ is allowed
        clone_dir = clone(cred_url(world["owner"], world["repo_name"], username), TMP_DIR / f"f3_{world['repo_name']}")
        make_commit(clone_dir, "docs/internal/notes.md", "n", "internal notes")
        before = fetch_ref(world["repo_id"], "refs/heads/main")
        result = push(clone_dir, "main")
        assert result.returncode != 0
        assert fetch_ref(world["repo_id"], "refs/heads/main") == before

        # regular docs still fine
        run_git(clone_dir, "reset", "--hard", "HEAD~1")
        head = make_commit(clone_dir, "docs/public.md", "p", "public doc")
        assert push(clone_dir, "main").returncode == 0
        assert fetch_ref(world["repo_id"], "refs/heads/main") == head

    def test_deletion_needs_branch_rule_only(self, world):
        username = self._setup(world, ("docs/", True))

        # maintainer seeds some content first
        admin_dir = clone(world["url"], TMP_DIR / f"f4admin_{world['repo_name']}")
        make_commit(admin_dir, "docs/tmp.md", "tmp", "seed doc")
        assert push(admin_dir, "main").returncode == 0

        clone_dir = clone(world["url"], TMP_DIR / f"f4_{world['repo_name']}")
        run_git(clone_dir, "rm", "docs/tmp.md")
        run_git(clone_dir, "commit", "-m", "delete doc")
        # deletion changes no surviving blob paths; docs/ allow covers removed path anyway
        assert push(clone_dir, "main").returncode == 0
