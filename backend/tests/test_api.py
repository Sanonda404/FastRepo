import asyncio
import os
import time

import asyncpg
import httpx
import pytest

from services.database import DATABASE_URL

SERVER_URL = os.getenv("TEST_SERVER_URL", "http://127.0.0.1:8000")

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
            assert body["default_branch"] == "master"
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
