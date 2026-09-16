import os
import subprocess

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
)
from test_pull_requests import (
    unique,
    token_for,
    auth,
    seed_repo_and_token,
    clone_and_push,
    push_branch,
    make_pr,
)

SERVER_URL = os.getenv("TEST_SERVER_URL", "http://127.0.0.1:8000")
API_URL = SERVER_URL + "/api"


@pytest.fixture
def client(server_url):
    return httpx.Client(base_url=API_URL)


@pytest.fixture
def server_url():
    return SERVER_URL


def add_collaborator(client, owner, repo_name, token, username, role):
    r = client.post(
        f"/collaborators/{owner}/{repo_name}",
        json={"identifier": username, "role": role},
        headers=auth(token),
    )
    assert r.status_code == 201, r.text


def seed_clean_pr(client, server_url, prefix):
    username = unique(prefix)
    repo_name = unique(prefix)
    repo_id, token = seed_repo_and_token(username, repo_name)
    url = repo_url(server_url, username, repo_name, GIT_PASSWORD)
    clone = TMP_DIR / f"mg_{repo_name}"
    clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
    run_git(clone, "checkout", "-b", "feature")
    make_commit(clone, "b.txt", "b", "feature work")
    push_branch(url, clone, "feature")
    pr = make_pr(f"{username}/{repo_name}", token, "feature", "main")
    return username, repo_name, repo_id, token, pr


def seed_conflict_pr(client, server_url, prefix):
    username = unique(prefix)
    repo_name = unique(prefix)
    repo_id, token = seed_repo_and_token(username, repo_name)
    url = repo_url(server_url, username, repo_name, GIT_PASSWORD)
    clone = TMP_DIR / f"mgc_{repo_name}"
    clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
    run_git(clone, "checkout", "-b", "feature")
    make_commit(clone, "a.txt", "conflicting", "feature change")
    push_branch(url, clone, "feature")
    run_git(clone, "checkout", "main")
    make_commit(clone, "a.txt", "main change", "main advance")
    push_branch(url, clone, "main")
    pr = make_pr(f"{username}/{repo_name}", token, "feature", "main")
    return username, repo_name, repo_id, token, pr


class TestMergeable:
    def test_mergeable_true(self, client, server_url):
        username, repo_name, _, token, pr = seed_clean_pr(client, server_url, "mgt")
        try:
            r = client.get(
                f"/pulls/{username}/{repo_name}/{pr['id']}/mergeable",
                headers=auth(token),
            )
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["mergeable"] is True
            assert body["reason"] is None
            assert body["conflicts"] == []
        finally:
            cleanup_repo(username, repo_name)

    def test_mergeable_conflict_lists_files(self, client, server_url):
        username, repo_name, _, token, pr = seed_conflict_pr(client, server_url, "mgc")
        try:
            r = client.get(
                f"/pulls/{username}/{repo_name}/{pr['id']}/mergeable",
                headers=auth(token),
            )
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["mergeable"] is False
            assert body["conflicts"] == ["a.txt"]
            assert "a.txt" in body["reason"]
        finally:
            cleanup_repo(username, repo_name)

    def test_mergeable_many_conflicts(self, client, server_url):
        username = unique("mgm")
        repo_name = unique("mgm")
        try:
            repo_id, token = seed_repo_and_token(username, repo_name)
            url = repo_url(server_url, username, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"mgm_{repo_name}"
            clone_and_push(
                url, clone,
                lambda d: [make_commit(d, f"f{i}.txt", "base", "base") for i in range(7)],
            )
            run_git(clone, "checkout", "-b", "feature")
            for i in range(7):
                make_commit(clone, f"f{i}.txt", "feature", "feature change")
            push_branch(url, clone, "feature")
            run_git(clone, "checkout", "main")
            for i in range(7):
                make_commit(clone, f"f{i}.txt", "main", "main advance")
            push_branch(url, clone, "main")
            pr = make_pr(f"{username}/{repo_name}", token, "feature", "main")
            r = client.get(
                f"/pulls/{username}/{repo_name}/{pr['id']}/mergeable",
                headers=auth(token),
            )
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["mergeable"] is False
            assert body["reason"] == "Merge conflicts in many paths"
            assert len(body["conflicts"]) == 7
        finally:
            cleanup_repo(username, repo_name)

    def test_mergeable_closed_pr(self, client, server_url):
        username, repo_name, _, token, pr = seed_clean_pr(client, server_url, "mgd")
        try:
            client.patch(
                f"/pulls/{username}/{repo_name}/{pr['id']}",
                json={"state": "closed"},
                headers=auth(token),
            )
            r = client.get(
                f"/pulls/{username}/{repo_name}/{pr['id']}/mergeable",
                headers=auth(token),
            )
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["mergeable"] is False
            assert body["reason"] == "Pull request is closed"
        finally:
            cleanup_repo(username, repo_name)

    def test_mergeable_after_merge(self, client, server_url):
        username, repo_name, _, token, pr = seed_clean_pr(client, server_url, "mgm")
        try:
            r = client.post(
                f"/pulls/{username}/{repo_name}/{pr['id']}/merge",
                headers=auth(token),
            )
            assert r.status_code == 200, r.text
            r = client.get(
                f"/pulls/{username}/{repo_name}/{pr['id']}/mergeable",
                headers=auth(token),
            )
            assert r.status_code == 200, r.text
            assert r.json()["mergeable"] is False
        finally:
            cleanup_repo(username, repo_name)

    def test_mergeable_fork(self, client, server_url):
        owner = unique("mgf")
        repo_name = unique("mgf")
        forker = unique("mgf")
        junk_name = unique("junkf")
        fork_name = unique("fork")
        try:
            _, owner_token = seed_repo_and_token(owner, repo_name)
            _, fork_token = seed_repo_and_token(forker, junk_name)
            url = repo_url(server_url, owner, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"mgf_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
            r = client.post(
                f"/repositories/{owner}/{repo_name}/fork",
                json={"name": fork_name},
                headers=auth(fork_token),
            )
            assert r.status_code == 201, r.text
            fork_id = r.json()["id"]
            fork_url = repo_url(server_url, forker, fork_name, GIT_PASSWORD)
            fork_clone = TMP_DIR / f"mgf_fork_{repo_name}"
            subprocess.run(
                ["git", "clone", url, str(fork_clone)],
                capture_output=True, text=True,
                env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
            )
            run_git(fork_clone, "checkout", "-b", "feature")
            make_commit(fork_clone, "fork.txt", "forked work", "fork feature")
            subprocess.run(
                ["git", "-C", str(fork_clone), "remote", "set-url", "origin", fork_url],
                capture_output=True, text=True,
            )
            push_branch(fork_url, fork_clone, "feature")
            pr = make_pr(
                f"{owner}/{repo_name}", fork_token, "feature", "main",
                source_repository_id=fork_id,
            )
            r = client.get(
                f"/pulls/{owner}/{repo_name}/{pr['id']}/mergeable",
                headers=auth(owner_token),
            )
            assert r.status_code == 200, r.text
            assert r.json()["mergeable"] is True
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(forker, junk_name)
            cleanup_repo(forker, fork_name)

    def test_mergeable_not_found(self, client, server_url):
        username = unique("mgn")
        repo_name = unique("mgn")
        try:
            _, token = seed_repo_and_token(username, repo_name)
            r = client.get(
                f"/pulls/{username}/{repo_name}/999999/mergeable",
                headers=auth(token),
            )
            assert r.status_code == 404
        finally:
            cleanup_repo(username, repo_name)


class TestMergePrivilegedOnly:
    def test_member_cannot_merge(self, client, server_url):
        username, repo_name, _, token, pr = seed_clean_pr(client, server_url, "mgp")
        member = unique("mgp")
        try:
            seed_repo(member, unique("junkp"))
            member_token = token_for(member)
            add_collaborator(client, username, repo_name, token, member, "Member")
            r = client.post(
                f"/pulls/{username}/{repo_name}/{pr['id']}/merge",
                headers=auth(member_token),
            )
            assert r.status_code == 403, r.text
            assert client.get(
                f"/pulls/{username}/{repo_name}/{pr['id']}",
                headers=auth(token),
            ).json()["state"] == "open"
        finally:
            cleanup_repo(username, repo_name)
            cleanup_repo(member, unique("junkp"))

    def test_maintainer_can_merge(self, client, server_url):
        username, repo_name, _, token, pr = seed_clean_pr(client, server_url, "mgq")
        maintainer = unique("mgq")
        try:
            seed_repo(maintainer, unique("junkq"))
            maintainer_token = token_for(maintainer)
            add_collaborator(client, username, repo_name, token, maintainer, "Maintainer")
            r = client.post(
                f"/pulls/{username}/{repo_name}/{pr['id']}/merge",
                headers=auth(maintainer_token),
            )
            assert r.status_code == 200, r.text
            assert r.json()["state"] == "closed"
        finally:
            cleanup_repo(username, repo_name)
            cleanup_repo(maintainer, unique("junkq"))

    def test_outsider_cannot_merge(self, client, server_url):
        username, repo_name, _, token, pr = seed_clean_pr(client, server_url, "mgr")
        outsider = unique("mgr")
        try:
            seed_repo(outsider, unique("junkr"))
            outsider_token = token_for(outsider)
            r = client.post(
                f"/pulls/{username}/{repo_name}/{pr['id']}/merge",
                headers=auth(outsider_token),
            )
            assert r.status_code == 403, r.text
        finally:
            cleanup_repo(username, repo_name)
            cleanup_repo(outsider, unique("junkr"))
