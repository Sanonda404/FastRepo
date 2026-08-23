import asyncio
import os
import time

import asyncpg
import httpx
import pytest

from services.database import DATABASE_URL

SERVER_URL = os.getenv("TEST_SERVER_URL", "http://127.0.0.1:8000")
API_URL = SERVER_URL + "/api"

PASSWORD = "testpass123"


def _run_async(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def unique(name):
    return f"{name}_{int(time.time() * 1000) % 10**7}_{os.getpid()}"


def cleanup_user(username: str) -> None:
    async def _cleanup():
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            await conn.execute("DELETE FROM users WHERE username = $1", username)
        finally:
            await conn.close()

    _run_async(_cleanup())


@pytest.fixture
def client():
    return httpx.Client(base_url=API_URL)


@pytest.fixture
def git_client():
    """Root-level client for git smart-HTTP endpoints (served outside /api)."""
    return httpx.Client(base_url=SERVER_URL)


def register(client, username, email=None, password=PASSWORD):
    return client.post(
        "/users/register",
        json={"username": username, "email": email or f"{username}@test.com", "password": password},
    )


def login(client, username, password=PASSWORD):
    return client.post("/users/login", data={"username": username, "password": password})


def create_repo(client, name, token, **extra):
    payload = {"name": name, "description": None, "is_private": False}
    payload.update(extra)
    return client.post(
        "/repositories/create",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def make_user(client, prefix):
    username = unique(prefix)
    assert register(client, username).status_code == 201
    token = login(client, username).json()["access_token"]
    return username, token


class TestUserEndpoints:
    def test_register_login_me_roundtrip(self, client):
        username = unique("user")
        try:
            reg = register(client, username)
            assert reg.status_code == 201
            body = reg.json()
            assert body["username"] == username
            assert body["email"] == f"{username}@test.com"
            assert "id" in body

            wrong = login(client, username, "wrongpass")
            assert wrong.status_code == 401

            ok = login(client, username)
            assert ok.status_code == 200
            assert ok.json()["token_type"] == "bearer"
            assert ok.json()["access_token"]

            me = client.get(
                "/users/me",
                headers={"Authorization": f"Bearer {ok.json()['access_token']}"},
            )
            assert me.status_code == 200
            assert me.json()["id"] == body["id"]
            assert me.json()["username"] == username
        finally:
            cleanup_user(username)

    def test_register_duplicate_rejected(self, client):
        username = unique("dup")
        try:
            assert register(client, username).status_code == 201
            dup = register(client, username)
            assert dup.status_code == 400
        finally:
            cleanup_user(username)

    def test_register_validation(self, client):
        short = register(client, unique("short"), password="abc")
        assert short.status_code == 422
        bad_email = register(client, unique("mail"), email="not-an-email")
        assert bad_email.status_code == 422

    def test_me_requires_token(self, client):
        assert client.get("/users/me").status_code == 401
        assert client.get("/users/me", headers={"Authorization": "Bearer bogus"}).status_code == 401


class TestRepositoryEndpoints:
    def test_create_requires_auth(self, client):
        r = create_repo(client, unique("repo"), token=None)
        assert r.status_code == 401
        r = create_repo(client, unique("repo"), token="bogus")
        assert r.status_code == 401

    def test_create_and_duplicate(self, client):
        username = unique("owner")
        repo_name = unique("repo")
        try:
            assert register(client, username).status_code == 201
            token = login(client, username).json()["access_token"]

            created = create_repo(client, repo_name, token)
            assert created.status_code == 201
            body = created.json()
            assert body["name"] == repo_name
            assert body["owner_id"] > 0
            assert body["default_branch"] == "main"
            assert body["is_private"] is False

            dup = create_repo(client, repo_name, token)
            assert dup.status_code == 400

            other = unique("other")
            assert register(client, other).status_code == 201
            other_token = login(client, other).json()["access_token"]
            # same repo name under a different owner is fine
            assert create_repo(client, repo_name, other_token).status_code == 201
            cleanup_user(other)
        finally:
            cleanup_user(username)


class TestUserUpdateDelete:
    def test_update_me_roundtrip(self, client):
        username = unique("user")
        try:
            assert register(client, username).status_code == 201
            token = login(client, username).json()["access_token"]
            new_pass = "newpass789"
            r = client.patch(
                "/users/me",
                json={"email": f"{username}@new.com", "password": new_pass},
                headers=auth(token),
            )
            assert r.status_code == 200
            assert r.json()["email"] == f"{username}@new.com"
            assert login(client, username, PASSWORD).status_code == 401
            assert login(client, username, new_pass).status_code == 200
        finally:
            cleanup_user(username)

    def test_update_me_rename_username(self, client):
        username = unique("user")
        new_name = unique("renamed")
        try:
            assert register(client, username).status_code == 201
            token = login(client, username).json()["access_token"]
            r = client.patch("/users/me", json={"username": new_name}, headers=auth(token))
            assert r.status_code == 200
            assert r.json()["username"] == new_name
            assert login(client, username).status_code == 401
            assert login(client, new_name).status_code == 200
        finally:
            cleanup_user(username)

    def test_update_me_requires_auth(self, client):
        assert client.patch("/users/me", json={"email": "x@y.com"}).status_code == 401

    def test_delete_me(self, client, git_client):
        username = unique("user")
        repo_name = unique("repo")
        try:
            assert register(client, username).status_code == 201
            token = login(client, username).json()["access_token"]
            assert create_repo(client, repo_name, token).status_code == 201

            r = client.delete("/users/me", headers=auth(token))
            assert r.status_code == 204
            assert login(client, username).status_code == 401
            assert client.get(f"/users/{username}").status_code == 404
            # repo gone too (cascade)
            assert git_client.get(f"/{username}/{repo_name}/info/refs",
                                  params={"service": "git-upload-pack"}).status_code == 404
        finally:
            cleanup_user(username)

    def test_get_profile(self, client):
        username = unique("user")
        try:
            assert register(client, username).status_code == 201
            body = client.get(f"/users/{username}")
            assert body.status_code == 200
            assert body.json()["username"] == username
            assert client.get("/users/__no_such_user__").status_code == 404
        finally:
            cleanup_user(username)


class TestRepositoryViewUpdateDelete:
    def test_view_public_and_private(self, client):
        owner, token = make_user(client, "owner")
        other, other_token = make_user(client, "other")
        repo_name = unique("repo")
        try:
            assert create_repo(client, repo_name, token).status_code == 201
            assert client.get(f"/repositories/{owner}/{repo_name}").status_code == 200

            priv_name = unique("pr")
            assert create_repo(client, priv_name, token, is_private=True).status_code == 201
            # anonymous can't see private
            assert client.get(f"/repositories/{owner}/{priv_name}").status_code == 403
            # other user can't see private
            assert client.get(
                f"/repositories/{owner}/{priv_name}", headers=auth(other_token)
            ).status_code == 403
            # owner can see private
            assert client.get(
                f"/repositories/{owner}/{priv_name}", headers=auth(token)
            ).status_code == 200
            # collaborator can see private
            add = client.post(
                f"/collaborators/{owner}/{priv_name}",
                json={"identifier": other, "role": "read"},
                headers=auth(token),
            )
            assert add.status_code == 201, add.text
            assert client.get(
                f"/repositories/{owner}/{priv_name}", headers=auth(other_token)
            ).status_code == 200
        finally:
            cleanup_user(other)
            cleanup_user(owner)

    def test_update_repo_owner_only(self, client):
        owner, token = make_user(client, "owner")
        other, other_token = make_user(client, "other")
        repo_name = unique("repo")
        try:
            assert create_repo(client, repo_name, token).status_code == 201
            r = client.patch(
                f"/repositories/{owner}/{repo_name}",
                json={"description": "new desc", "is_private": True},
                headers=auth(token),
            )
            assert r.status_code == 200
            body = r.json()
            assert body["description"] == "new desc"
            assert body["is_private"] is True
            assert r.status_code == 200

            assert client.patch(
                f"/repositories/{owner}/{repo_name}", json={"description": "x"}, headers=auth(other_token)
            ).status_code == 403
            assert client.patch(
                f"/repositories/{owner}/{repo_name}", json={"description": "x"}
            ).status_code == 401

            # rename into an existing name -> 400
            dup_name = unique("dup")
            assert create_repo(client, dup_name, token).status_code == 201
            r = client.patch(
                f"/repositories/{owner}/{repo_name}", json={"name": dup_name}, headers=auth(token)
            )
            assert r.status_code == 400
        finally:
            cleanup_user(other)
            cleanup_user(owner)

    def test_delete_repo_owner_only(self, client):
        owner, token = make_user(client, "owner")
        other, other_token = make_user(client, "other")
        repo_name = unique("repo")
        try:
            assert create_repo(client, repo_name, token).status_code == 201
            assert client.delete(
                f"/repositories/{owner}/{repo_name}", headers=auth(other_token)
            ).status_code == 403
            assert client.delete(f"/repositories/{owner}/{repo_name}").status_code == 401

            r = client.delete(f"/repositories/{owner}/{repo_name}", headers=auth(token))
            assert r.status_code == 204
            assert client.get(f"/repositories/{owner}/{repo_name}").status_code == 404
        finally:
            cleanup_user(other)
            cleanup_user(owner)

    def test_fork_private_forbidden(self, client):
        owner, token = make_user(client, "owner")
        other, other_token = make_user(client, "other")
        repo_name = unique("repo")
        try:
            assert create_repo(client, repo_name, token, is_private=True).status_code == 201
            r = client.post(
                f"/repositories/{owner}/{repo_name}/fork",
                json={},
                headers=auth(other_token),
            )
            assert r.status_code == 403
            ok = client.post(
                f"/repositories/{owner}/{repo_name}/fork",
                json={"name": unique("fork")},
                headers=auth(token),
            )
            assert ok.status_code == 201
        finally:
            cleanup_user(other)
            cleanup_user(owner)

    def test_fork_copies_git_data(self, client, git_client):
        owner, token = make_user(client, "owner")
        repo_name = unique("repo")
        fork_name = unique("fork")
        try:
            assert create_repo(client, repo_name, token).status_code == 201
            src_id = client.get(f"/repositories/{owner}/{repo_name}").json()["id"]
            ok = client.post(
                f"/repositories/{owner}/{repo_name}/fork",
                json={"name": fork_name},
                headers=auth(token),
            )
            assert ok.status_code == 201
            fork_id = ok.json()["id"]

            async def heads():
                conn = await asyncpg.connect(DATABASE_URL)
                try:
                    return await conn.fetchrow(
                        "SELECT name, symref FROM refs WHERE repo_id = $1 AND name = 'HEAD'",
                        fork_id,
                    )
                finally:
                    await conn.close()

            head = _run_async(heads())
            assert head is not None
            assert head["symref"] == "refs/heads/main"
            assert fork_id != src_id
            # fork is cloneable via git with owner creds
            r = git_client.get(
                f"/{owner}/{fork_name}/info/refs",
                params={"service": "git-upload-pack"},
                auth=(owner, PASSWORD),
            )
            assert r.status_code == 200
        finally:
            cleanup_user(owner)


class TestGitAuthOverHTTP:
    def test_private_repo_git_requires_basic_auth(self, client, git_client):
        owner, token = make_user(client, "owner")
        other, other_token = make_user(client, "other")
        repo_name = unique("repo")
        try:
            assert create_repo(client, repo_name, token, is_private=True).status_code == 201
            url = f"/{owner}/{repo_name}/info/refs"

            # anonymous (no auth) -> 401
            r = git_client.get(url, params={"service": "git-upload-pack"})
            assert r.status_code == 401

            # wrong password -> 401
            r = git_client.get(url, params={"service": "git-upload-pack"}, auth=(owner, "wrongpass"))
            assert r.status_code == 401

            # non-collaborator -> 403
            r = git_client.get(url, params={"service": "git-upload-pack"}, auth=(other, PASSWORD))
            assert r.status_code == 403

            # owner -> 200
            r = git_client.get(url, params={"service": "git-upload-pack"}, auth=(owner, PASSWORD))
            assert r.status_code == 200

            # collaborator -> 200
            add = client.post(
                f"/collaborators/{owner}/{repo_name}",
                json={"identifier": other, "role": "read"},
                headers=auth(token),
            )
            assert add.status_code == 201, add.text
            r = git_client.get(url, params={"service": "git-upload-pack"}, auth=(other, PASSWORD))
            assert r.status_code == 200
        finally:
            cleanup_user(other)
            cleanup_user(owner)

    def test_public_repo_push_requires_auth(self, client, git_client):
        owner, token = make_user(client, "owner")
        repo_name = unique("repo")
        try:
            assert create_repo(client, repo_name, token).status_code == 201
            url = f"/{owner}/{repo_name}/info/refs"
            # anonymous clone of public repo -> 200
            r = git_client.get(url, params={"service": "git-upload-pack"})
            assert r.status_code == 200
            # anonymous push advertisement -> 401
            r = git_client.get(url, params={"service": "git-receive-pack"})
            assert r.status_code == 401
            # owner push advertisement -> 200
            r = git_client.get(url, params={"service": "git-receive-pack"}, auth=(owner, PASSWORD))
            assert r.status_code == 200
            # authenticated non-owner push -> 403
            other, other_token = make_user(client, "other")
            r = git_client.get(url, params={"service": "git-receive-pack"}, auth=(other, PASSWORD))
            assert r.status_code == 403
            cleanup_user(other)
        finally:
            cleanup_user(owner)
