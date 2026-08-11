import os
import subprocess
from pathlib import Path

import asyncpg
import httpx
import pytest

from test_git_cli import (
    TMP_DIR,
    GIT_PASSWORD,
    repo_url,
    run_git,
    seed_repo,
    cleanup_repo,
    make_commit,
    fetch_ref,
    _run_async,
)
from services.database import DATABASE_URL

SERVER_URL = os.getenv("TEST_SERVER_URL", "http://127.0.0.1:8000")

_unique_counter = 0


def unique(name):
    global _unique_counter
    _unique_counter += 1
    return (
        f"{name}_{int(__import__('time').time() * 1000) % 10**7}"
        f"_{os.getpid()}_{_unique_counter}"
    )


@pytest.fixture
def server_url():
    return SERVER_URL


@pytest.fixture
def client(server_url):
    return httpx.Client(base_url=server_url)


def token_for(username: str, password: str = GIT_PASSWORD) -> str:
    with httpx.Client(base_url=SERVER_URL) as client:
        login = client.post("/users/login", data={"username": username, "password": password})
        assert login.status_code == 200, login.text
        return login.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def seed_repo_and_token(username: str, repo_name: str) -> tuple[int, str]:
    repo_id = seed_repo(username, repo_name)
    return repo_id, token_for(username)


def push_branch(repo_url_: str, clone_dir: Path, branch: str) -> None:
    result = subprocess.run(
        ["git", "-C", str(clone_dir), "push", "origin", branch],
        capture_output=True,
        text=True,
        env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
    )
    assert result.returncode == 0, result.stderr


def clone_and_push(url: str, clone_dir: Path, commit_fn) -> None:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        ["git", "clone", url, str(clone_dir)],
        capture_output=True,
        text=True,
        env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
    )
    assert result.returncode == 0, result.stderr
    commit_fn(clone_dir)
    push_branch(url, clone_dir, "main")


def make_pr(base: str, token: str, source: str, target: str,
            source_repository_id: int | None = None, body: str = "pr body") -> dict:
    with httpx.Client(base_url=SERVER_URL) as client:
        r = client.post(
                f"/pulls/{base}",
            json={
                "body": body,
                "source_branch": source,
                "target_branch": target,
                "source_repository_id": source_repository_id,
            },
            headers=auth(token),
        )
        assert r.status_code == 201, r.text
        return r.json()


class TestPullRequestCRUD:
    def test_create_list_get(self, client, server_url):
        username = unique("pr")
        repo_name = unique("pr")
        try:
            repo_id, token = seed_repo_and_token(username, repo_name)
            url = repo_url(server_url, username, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"prc_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
            run_git(clone, "checkout", "-b", "feature")
            make_commit(clone, "b.txt", "b", "feature work")
            push_branch(url, clone, "feature")

            pr = make_pr(f"{username}/{repo_name}", token, "feature", "main")
            assert pr["state"] == "open"
            assert pr["source_branch"] == "feature"
            assert pr["target_branch"] == "main"
            assert pr["source_repository_id"] is None
            assert pr["author_username"] == username
            assert pr["closed_at"] is None
            assert pr["body"] == "pr body"

            got = client.get(f"/pulls/{username}/{repo_name}/{pr['id']}", headers=auth(token))
            assert got.status_code == 200
            assert got.json()["id"] == pr["id"]

            listing = client.get(f"/pulls/{username}/{repo_name}", headers=auth(token))
            assert listing.status_code == 200
            assert [p["id"] for p in listing.json()] == [pr["id"]]
        finally:
            cleanup_repo(username, repo_name)

    def test_create_validation(self, client, server_url):
        username = unique("prv")
        repo_name = unique("prv")
        try:
            _, token = seed_repo_and_token(username, repo_name)
            url = repo_url(server_url, username, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"prv_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))

            base = f"{username}/{repo_name}"
            r = client.post(f"/pulls/{base}",
                            json={"source_branch": "nope", "target_branch": "main"},
                            headers=auth(token))
            assert r.status_code == 400
            r = client.post(f"/pulls/{base}",
                            json={"source_branch": "main", "target_branch": "main"},
                            headers=auth(token))
            assert r.status_code == 400
        finally:
            cleanup_repo(username, repo_name)

    def test_update_state_and_body(self, client, server_url):
        username = unique("pru")
        repo_name = unique("pru")
        try:
            _, token = seed_repo_and_token(username, repo_name)
            url = repo_url(server_url, username, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"pru_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
            run_git(clone, "checkout", "-b", "feature")
            make_commit(clone, "b.txt", "b", "feature work")
            push_branch(url, clone, "feature")
            pr = make_pr(f"{username}/{repo_name}", token, "feature", "main")

            base = f"/pulls/{username}/{repo_name}/{pr['id']}"
            r = client.patch(base, json={"body": "updated"}, headers=auth(token))
            assert r.status_code == 200 and r.json()["body"] == "updated"
            r = client.patch(base, json={"state": "closed"}, headers=auth(token))
            assert r.status_code == 200
            assert r.json()["state"] == "closed" and r.json()["closed_at"] is not None
            r = client.patch(base, json={"state": "open"}, headers=auth(token))
            assert r.json()["state"] == "open" and r.json()["closed_at"] is None
        finally:
            cleanup_repo(username, repo_name)

    def test_delete_and_permissions(self, client, server_url):
        owner = unique("prd")
        repo_name = unique("prd")
        intruder = unique("prd")
        try:
            _, token = seed_repo_and_token(owner, repo_name)
            seed_repo(intruder, unique("junk"))
            intruder_token = token_for(intruder)
            url = repo_url(server_url, owner, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"prd_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
            run_git(clone, "checkout", "-b", "feature")
            make_commit(clone, "b.txt", "b", "feature work")
            push_branch(url, clone, "feature")
            pr = make_pr(f"{owner}/{repo_name}", token, "feature", "main")

            base = f"/pulls/{owner}/{repo_name}/{pr['id']}"
            assert client.delete(base, headers=auth(intruder_token)).status_code == 403
            assert client.delete(base, headers=auth(token)).status_code == 204
            assert client.get(base, headers=auth(token)).status_code == 404
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(intruder, unique("junk"))

    def test_private_repo_requires_access(self, client, server_url):
        owner = unique("prv2")
        repo_name = unique("prv2")
        intruder = unique("prv2")
        try:
            _, token = seed_repo_and_token(owner, repo_name)
            seed_repo(intruder, unique("junk2"))
            intruder_token = token_for(intruder)
            url = repo_url(server_url, owner, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"prv2_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
            run_git(clone, "checkout", "-b", "feature")
            make_commit(clone, "b.txt", "b", "feature work")
            push_branch(url, clone, "feature")
            client.patch(f"/repositories/{owner}/{repo_name}", json={"is_private": True},
                         headers=auth(token))

            r = client.post(f"/pulls/{owner}/{repo_name}",
                            json={"source_branch": "feature", "target_branch": "main"},
                            headers=auth(intruder_token))
            assert r.status_code == 403
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(intruder, unique("junk2"))


class TestPullRequestMerge:
    def test_merge_same_repo(self, client, server_url):
        username = unique("pm")
        repo_name = unique("pm")
        try:
            repo_id, token = seed_repo_and_token(username, repo_name)
            url = repo_url(server_url, username, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"pm_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
            main_head = fetch_ref(repo_id, "refs/heads/main")

            run_git(clone, "checkout", "-b", "feature")
            make_commit(clone, "a.txt", "a v2", "change a")
            make_commit(clone, "b.txt", "b", "add b")
            push_branch(url, clone, "feature")
            pr = make_pr(f"{username}/{repo_name}", token, "feature", "main")

            r = client.post(f"/pulls/{username}/{repo_name}/{pr['id']}/merge",
                            headers=auth(token))
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["state"] == "closed"
            assert len(body["merge_commit_sha"]) == 40
            assert body["closed_at"] is not None

            merged_sha = body["merge_commit_sha"]
            assert fetch_ref(repo_id, "refs/heads/main") == merged_sha
            assert merged_sha != main_head

            detail = client.get(
                f"/repositories/{username}/{repo_name}/commits/{merged_sha}",
                headers=auth(token),
            ).json()
            assert len(detail["parents"]) == 2

            # merged tree contains both sides
            tree = client.get(
                f"/repositories/{username}/{repo_name}/tree", headers=auth(token)
            ).json()
            names = [e["name"] for e in tree["entries"]]
            assert "a.txt" in names and "b.txt" in names
        finally:
            cleanup_repo(username, repo_name)

    def test_merge_conflict_409(self, client, server_url):
        username = unique("pmc")
        repo_name = unique("pmc")
        try:
            repo_id, token = seed_repo_and_token(username, repo_name)
            url = repo_url(server_url, username, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"pmc_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))

            # branch: change a.txt, then advance main separately
            run_git(clone, "checkout", "-b", "feature")
            make_commit(clone, "a.txt", "conflicting", "feature change")
            push_branch(url, clone, "feature")
            run_git(clone, "checkout", "main")
            make_commit(clone, "a.txt", "main change", "main advance")
            push_branch(url, clone, "main")
            main_head = fetch_ref(repo_id, "refs/heads/main")
            pr = make_pr(f"{username}/{repo_name}", token, "feature", "main")

            r = client.post(f"/pulls/{username}/{repo_name}/{pr['id']}/merge",
                            headers=auth(token))
            assert r.status_code == 409
            assert fetch_ref(repo_id, "refs/heads/main") == main_head
            assert client.get(f"/pulls/{username}/{repo_name}/{pr['id']}",
                              headers=auth(token)).json()["state"] == "open"
        finally:
            cleanup_repo(username, repo_name)

    def test_merge_fork_adds_author_as_collaborator(self, client, server_url):
        owner = unique("pmf")
        repo_name = unique("pmf")
        forker = unique("pmf")
        junk_name = unique("junkf")
        fork_name = unique("fork")
        try:
            repo_id, owner_token = seed_repo_and_token(owner, repo_name)
            _, fork_token = seed_repo_and_token(forker, junk_name)
            url = repo_url(server_url, owner, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"pmf_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))

            # fork the repo via API
            r = client.post(f"/repositories/{owner}/{repo_name}/fork",
                            json={"name": fork_name}, headers=auth(fork_token))
            assert r.status_code == 201, r.text
            fork_id = r.json()["id"]

            fork_url = repo_url(server_url, forker, fork_name, GIT_PASSWORD)
            fork_clone = TMP_DIR / f"pmf_fork_{repo_name}"
            subprocess.run(["git", "clone", url, str(fork_clone)],
                           capture_output=True, text=True,
                           env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
            run_git(fork_clone, "checkout", "-b", "feature")
            make_commit(fork_clone, "fork.txt", "forked work", "fork feature")
            subprocess.run(["git", "-C", str(fork_clone), "remote", "set-url", "origin", fork_url],
                           capture_output=True, text=True)
            push_branch(fork_url, fork_clone, "feature")

            pr = make_pr(f"{owner}/{repo_name}", fork_token, "feature", "main",
                         source_repository_id=fork_id)

            def _collab_exists():
                async def _check():
                    conn = await asyncpg.connect(DATABASE_URL)
                    try:
                        return await conn.fetchval(
                            "SELECT count(*) FROM repository_collaborators "
                            "WHERE repository_id = $1", repo_id)
                    finally:
                        await conn.close()
                return _run_async(_check())

            assert _collab_exists() == 0
            r = client.post(f"/pulls/{owner}/{repo_name}/{pr['id']}/merge",
                            headers=auth(owner_token))
            assert r.status_code == 200, r.text
            assert _collab_exists() == 1

            tree = client.get(f"/repositories/{owner}/{repo_name}/tree",
                              headers=auth(owner_token)).json()
            names = [e["name"] for e in tree["entries"]]
            assert "fork.txt" in names and "a.txt" in names
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(forker, junk_name)

    def test_merge_auth_and_closed(self, client, server_url):
        owner = unique("pma")
        repo_name = unique("pma")
        intruder = unique("pma")
        try:
            _, owner_token = seed_repo_and_token(owner, repo_name)
            seed_repo(intruder, unique("junk3"))
            intruder_token = token_for(intruder)
            url = repo_url(server_url, owner, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"pma_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
            run_git(clone, "checkout", "-b", "feature")
            make_commit(clone, "b.txt", "b", "feature work")
            push_branch(url, clone, "feature")
            pr = make_pr(f"{owner}/{repo_name}", owner_token, "feature", "main")

            base = f"/pulls/{owner}/{repo_name}/{pr['id']}/merge"
            assert client.post(base, headers=auth(intruder_token)).status_code == 403

            client.patch(f"/pulls/{owner}/{repo_name}/{pr['id']}",
                         json={"state": "closed"}, headers=auth(owner_token))
            assert client.post(base, headers=auth(owner_token)).status_code == 400
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(intruder, unique("junk3"))
