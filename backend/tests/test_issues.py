import os
import time

import httpx
import pytest

from test_pull_requests import (
    API_URL,
    unique,
    token_for,
    auth,
    seed_repo_and_token,
)
from test_git_cli import seed_repo, cleanup_repo, GIT_PASSWORD

TEST_SERVER_URL = API_URL


@pytest.fixture
def server_url():
    return TEST_SERVER_URL


@pytest.fixture
def client(server_url):
    return httpx.Client(base_url=server_url)


def seed_private_repo(username: str, repo_name: str) -> tuple[int, str]:
    with httpx.Client(base_url=TEST_SERVER_URL) as client:
        reg = client.post(
            "/users/register",
            json={"username": username, "email": f"{username}@test.com", "password": GIT_PASSWORD},
        )
        assert reg.status_code == 201, reg.text
        token = token_for(username)
        r = client.post(
            "/repositories/create",
            json={"name": repo_name, "description": None, "is_private": True},
            headers=auth(token),
        )
        assert r.status_code == 201, r.text
        return r.json()["id"], token


def make_private_repo(owner: str, repo_name: str, token: str) -> dict:
    with httpx.Client(base_url=TEST_SERVER_URL) as client:
        r = client.post(
            "/repositories/create",
            json={"name": repo_name, "description": None, "is_private": True},
            headers=auth(token),
        )
        assert r.status_code == 201, r.text
        return r.json()


def make_public_repo(owner: str, repo_name: str, token: str) -> dict:
    with httpx.Client(base_url=TEST_SERVER_URL) as client:
        r = client.post(
            "/repositories/create",
            json={"name": repo_name, "description": None, "is_private": False},
            headers=auth(token),
        )
        assert r.status_code == 201, r.text
        return r.json()


def create_issue(client, base: str, token: str, title="t", body="b") -> dict:
    r = client.post(f"/issues/{base}", headers=auth(token), json={"title": title, "body": body})
    assert r.status_code == 201, r.text
    return r.json()


def add_collaborator(owner: str, repo_name: str, owner_token: str, username: str) -> None:
    with httpx.Client(base_url=TEST_SERVER_URL) as client:
        r = client.post(
            f"/collaborators/{owner}/{repo_name}",
            json={"identifier": username, "role": "Member"},
            headers=auth(owner_token),
        )
        assert r.status_code == 201, r.text


def seed_other(username: str) -> str:
    seed_repo(username, unique("junk"))
    return token_for(username)


class TestCollaboratorRoutes:
    def test_list_collaborators(self, client, server_url):
        owner = unique("iss")
        collab_a = unique("iss")
        collab_b = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_private_repo(owner, repo_name)
            a_token = seed_other(collab_a)
            b_token = seed_other(collab_b)
            add_collaborator(owner, repo_name, token, collab_a)
            add_collaborator(owner, repo_name, token, collab_b)

            r = client.get(f"/collaborators/{owner}/{repo_name}", headers=auth(token))
            assert r.status_code == 200
            users = {c["username"]: c["role"] for c in r.json()}
            assert users == {collab_a: "Member", collab_b: "Member"}
            assert {"id", "repository_id", "user_id", "username", "email", "role"} <= set(r.json()[0].keys())

            # collaborator can list too
            assert client.get(
                f"/collaborators/{owner}/{repo_name}", headers=auth(a_token)
            ).status_code == 200
            # outsider on private repo -> 403
            outsider = unique("iss")
            seed_repo(outsider, unique("junk"))
            assert client.get(
                f"/collaborators/{owner}/{repo_name}", headers=auth(token_for(outsider))
            ).status_code == 403
            cleanup_repo(outsider, unique("junk"))
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(collab_a, unique("junk"))
            cleanup_repo(collab_b, unique("junk"))

    def test_list_collaborators_public_repo_any_auth_user(self, client, server_url):
        owner = unique("iss")
        other = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(owner, repo_name)
            other_token = seed_other(other)
            add_collaborator(owner, repo_name, token, other)

            r = client.get(f"/collaborators/{owner}/{repo_name}", headers=auth(other_token))
            assert r.status_code == 200
            assert [c["username"] for c in r.json()] == [other]
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(other, unique("junk"))

    def test_list_collaborators_repo_not_found(self, client, server_url):
        username = unique("iss")
        try:
            seed_repo(username, unique("junk"))
            token = token_for(username)
            r = client.get(f"/collaborators/{username}/no-such", headers=auth(token))
            assert r.status_code == 404
        finally:
            cleanup_repo(username, unique("junk"))

    def test_add_and_remove_collaborator(self, client, server_url):
        owner = unique("iss")
        collab = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_private_repo(owner, repo_name)
            collab_token = seed_other(collab)
            add_collaborator(owner, repo_name, token, collab)

            # collaborator can use the private repo
            r = client.post(
                f"/issues/{owner}/{repo_name}",
                headers=auth(collab_token),
                json={"title": "t", "body": "b"},
            )
            assert r.status_code == 201

            # owner removes collaborator -> 200 with deleted collaborator info (now by collaborator_id)
            r = client.get(f"/collaborators/{owner}/{repo_name}", headers=auth(token))
            assert r.status_code == 200
            collab_id = next(c["id"] for c in r.json() if c["username"] == collab)
            r = client.delete(
                f"/collaborators/{owner}/{repo_name}/{collab_id}", headers=auth(token)
            )
            assert r.status_code == 200
            removed = r.json()
            assert removed["username"] == collab
            assert removed["role"] == "Member"

            # collaborator loses private access
            r = client.post(
                f"/issues/{owner}/{repo_name}",
                headers=auth(collab_token),
                json={"title": "t", "body": "b"},
            )
            assert r.status_code == 403
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(collab, unique("junk"))

    def test_owner_only_can_manage_collaborators(self, client, server_url):
        owner = unique("iss")
        other = unique("iss")
        collab = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_private_repo(owner, repo_name)
            other_token = seed_other(other)
            collab_token = seed_other(collab)

            # non-owner cannot add
            r = client.post(
                f"/collaborators/{owner}/{repo_name}",
                json={"identifier": collab, "role": "Member"},
                headers=auth(other_token),
            )
            assert r.status_code == 403

            # owner adds collab, non-owner cannot remove
            add_collaborator(owner, repo_name, token, collab)
            r = client.get(f"/collaborators/{owner}/{repo_name}", headers=auth(token))
            assert r.status_code == 200
            collab_id = next(c["id"] for c in r.json() if c["username"] == collab)
            r = client.delete(
                f"/collaborators/{owner}/{repo_name}/{collab_id}", headers=auth(other_token)
            )
            assert r.status_code == 403
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(other, unique("junk"))
            cleanup_repo(collab, unique("junk"))

    def test_add_missing_user_and_remove_missing_collaborator(self, client, server_url):
        owner = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_private_repo(owner, repo_name)
            # collaborator user does not exist
            r = client.post(
                f"/collaborators/{owner}/{repo_name}",
                json={"identifier": "no_such_user", "role": "Viewer"},
                headers=auth(token),
            )
            assert r.status_code == 404

            # user exists but is not a collaborator -> 404 (now by collaborator_id)
            other = unique("iss")
            seed_repo(other, unique("junk"))
            r = client.delete(
                f"/collaborators/{owner}/{repo_name}/999999", headers=auth(token)
            )
            assert r.status_code == 404
            cleanup_repo(other, unique("junk"))
        finally:
            cleanup_repo(owner, repo_name)


class TestIssueCRUD:
    def test_create_list_get_on_public(self, client, server_url):
        username = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(username, repo_name)
            issue = create_issue(client, f"{username}/{repo_name}", token, "Bug", "details")
            assert issue["state"] == "open"
            assert issue["number"] == 1
            assert issue["author_username"] == username
            assert issue["title"] == "Bug"
            assert issue["repository_name"] == repo_name

            lst = client.get(f"/issues/{username}/{repo_name}", headers=auth(token))
            assert lst.status_code == 200
            assert [i["id"] for i in lst.json()] == [issue["id"]]
        finally:
            cleanup_repo(username, repo_name)

    def test_any_user_can_create_on_public(self, client, server_url):
        owner = unique("iss")
        other = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(owner, repo_name)
            seed_repo(other, unique("junk"))
            other_token = token_for(other)
            issue = create_issue(client, f"{owner}/{repo_name}", other_token, "from other")
            assert issue["author_username"] == other
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(other, unique("junk"))

    def test_create_repo_not_found(self, client, server_url):
        username = unique("iss")
        try:
            seed_repo(username, unique("junk"))
            token = token_for(username)
            r = client.post(
                f"/issues/{username}/does-not-exist",
                headers=auth(token),
                json={"title": "t", "body": "b"},
            )
            assert r.status_code == 404
        finally:
            cleanup_repo(username, unique("junk"))

    def test_create_invalid_title(self, client, server_url):
        username = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(username, repo_name)
            r = client.post(
                f"/issues/{username}/{repo_name}",
                headers=auth(token),
                json={"title": "", "body": "b"},
            )
            assert r.status_code == 422
        finally:
            cleanup_repo(username, repo_name)


class TestIssuePrivateRepo:
    def test_deny_outsider_on_private(self, client, server_url):
        owner = unique("iss")
        other = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_private_repo(owner, repo_name)
            other_token = seed_other(other)

            r = client.post(
                f"/issues/{owner}/{repo_name}",
                headers=auth(other_token),
                json={"title": "t", "body": "b"},
            )
            assert r.status_code == 403
            assert r.json()["detail"] == "Private repository"

            r = client.get(f"/issues/{owner}/{repo_name}", headers=auth(other_token))
            assert r.status_code == 403
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(other, unique("junk"))

    def test_owner_and_collaborator_can_use_private(self, client, server_url):
        owner = unique("iss")
        collab = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_private_repo(owner, repo_name)
            collab_token = seed_other(collab)
            add_collaborator(owner, repo_name, token, collab)

            issue = create_issue(client, f"{owner}/{repo_name}", collab_token, "by collab")
            assert issue["author_username"] == collab

            lst = client.get(f"/issues/{owner}/{repo_name}", headers=auth(collab_token))
            assert lst.status_code == 200
            assert [i["author_username"] for i in lst.json()] == [collab]
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(collab, unique("junk"))

    def test_close_by_outsider_on_public_denied(self, client, server_url):
        owner = unique("iss")
        other = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(owner, repo_name)
            seed_repo(other, unique("junk"))
            other_token = token_for(other)
            issue = create_issue(client, f"{owner}/{repo_name}", token, "t")

            r = client.patch(
                f"/issues/{owner}/{repo_name}/{issue['number']}", headers=auth(other_token)
            )
            assert r.status_code == 403
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(other, unique("junk"))

    def test_close_by_author_and_owner(self, client, server_url):
        owner = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(owner, repo_name)
            issue = create_issue(client, f"{owner}/{repo_name}", token, "t")

            r = client.patch(f"/issues/{owner}/{repo_name}/{issue['number']}", headers=auth(token))
            assert r.status_code == 200
            closed = r.json()
            assert closed["state"] == "closed"
            assert closed["closed_by_username"] == owner
            assert closed["body"] == "b"
        finally:
            cleanup_repo(owner, repo_name)

    def test_close_nonexistent_issue(self, client, server_url):
        username = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(username, repo_name)
            r = client.patch(f"/issues/{username}/{repo_name}/4242", headers=auth(token))
            assert r.status_code == 404
        finally:
            cleanup_repo(username, repo_name)


class TestIssueDelete:
    def test_author_can_delete_gets_deleted_issue(self, client, server_url):
        username = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(username, repo_name)
            issue = create_issue(client, f"{username}/{repo_name}", token, "gone")
            r = client.delete(
                f"/issues/{username}/{repo_name}/{issue['number']}", headers=auth(token)
            )
            assert r.status_code == 200
            deleted = r.json()
            assert deleted["id"] == issue["id"]
            assert deleted["title"] == "gone"
            assert deleted["author_username"] == username

            lst = client.get(f"/issues/{username}/{repo_name}", headers=auth(token))
            assert lst.status_code == 404  # no issues remain in the repository
        finally:
            cleanup_repo(username, repo_name)

    def test_non_author_cannot_delete(self, client, server_url):
        owner = unique("iss")
        other = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(owner, repo_name)
            seed_repo(other, unique("junk"))
            other_token = token_for(other)
            issue = create_issue(client, f"{owner}/{repo_name}", token, "t")

            r = client.delete(
                f"/issues/{owner}/{repo_name}/{issue['number']}", headers=auth(other_token)
            )
            assert r.status_code == 403
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(other, unique("junk"))

    def test_delete_missing_issue(self, client, server_url):
        username = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(username, repo_name)
            r = client.delete(f"/issues/{username}/{repo_name}/9999", headers=auth(token))
            assert r.status_code == 404
        finally:
            cleanup_repo(username, repo_name)


class TestIssueComments:
    def test_comment_crud_on_public(self, client, server_url):
        username = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(username, repo_name)
            issue = create_issue(client, f"{username}/{repo_name}", token, "t")

            r = client.post(
                f"/issues-comments/{issue['id']}", headers=auth(token), json={"body": "first"}
            )
            assert r.status_code == 201
            comment = r.json()
            assert comment["issue_id"] == issue["id"]
            assert comment["author_username"] == username
            assert comment["body"] == "first"

            lst = client.get(f"/issues-comments/{issue['id']}", headers=auth(token))
            assert lst.status_code == 200
            assert [c["body"] for c in lst.json()] == ["first"]

            r = client.delete(f"/issues-comments/{comment['id']}", headers=auth(token))
            assert r.status_code == 200
            assert r.json()["id"] == comment["id"]
            assert r.json()["body"] == "first"

            lst = client.get(f"/issues-comments/{issue['id']}", headers=auth(token))
            assert lst.json() == []
        finally:
            cleanup_repo(username, repo_name)

    def test_comment_on_private_denied_for_outsider(self, client, server_url):
        owner = unique("iss")
        other = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_private_repo(owner, repo_name)
            other_token = seed_other(other)
            issue = create_issue(client, f"{owner}/{repo_name}", token, "t")

            r = client.post(
                f"/issues-comments/{issue['id']}", headers=auth(other_token), json={"body": "x"}
            )
            assert r.status_code == 403

            r = client.get(f"/issues-comments/{issue['id']}", headers=auth(other_token))
            assert r.status_code == 403
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(other, unique("junk"))

    def test_comment_on_missing_issue(self, client, server_url):
        username = unique("iss")
        try:
            seed_repo(username, unique("junk"))
            token = token_for(username)
            r = client.post(
                "/issues-comments/999999", headers=auth(token), json={"body": "x"}
            )
            assert r.status_code == 404
        finally:
            cleanup_repo(username, unique("junk"))

    def test_non_author_cannot_delete_comment(self, client, server_url):
        owner = unique("iss")
        other = unique("iss")
        repo_name = unique("iss")
        try:
            _, token = seed_repo_and_token(owner, repo_name)
            seed_repo(other, unique("junk"))
            other_token = token_for(other)
            issue = create_issue(client, f"{owner}/{repo_name}", token, "t")
            comment = client.post(
                f"/issues-comments/{issue['id']}", headers=auth(token), json={"body": "mine"}
            ).json()

            r = client.delete(f"/issues-comments/{comment['id']}", headers=auth(other_token))
            assert r.status_code == 403
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(other, unique("junk"))

    def test_delete_missing_comment(self, client, server_url):
        username = unique("iss")
        try:
            seed_repo(username, unique("junk"))
            token = token_for(username)
            r = client.delete("/issues-comments/999999", headers=auth(token))
            assert r.status_code == 404
        finally:
            cleanup_repo(username, unique("junk"))


class TestIssueAssignees:
    def test_assign_list_remove(self, client, server_url):
        owner = unique("asg")
        collab = unique("asg")
        repo_name = unique("asg")
        try:
            _, token = seed_private_repo(owner, repo_name)
            collab_token = seed_other(collab)
            add_collaborator(owner, repo_name, token, collab)
            issue = create_issue(client, f"{owner}/{repo_name}", token)

            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue['number']}/assignees",
                headers=auth(token), json={"username": collab},
            )
            assert r.status_code == 201, r.text
            assert r.json() == {"username": collab}

            # idempotent re-assign
            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue['number']}/assignees",
                headers=auth(token), json={"username": collab},
            )
            assert r.status_code == 201, r.text

            r = client.get(
                f"/issues/{owner}/{repo_name}/{issue['number']}/assignees",
                headers=auth(token),
            )
            assert r.status_code == 200
            assert [a["username"] for a in r.json()] == [collab]

            # assigning any existing user is allowed, even without repo access
            outsider = unique("asg")
            seed_repo(outsider, unique("junk"))
            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue['number']}/assignees",
                headers=auth(token), json={"username": outsider},
            )
            assert r.status_code == 201

            # unknown user -> 404
            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue['number']}/assignees",
                headers=auth(token), json={"username": "no-such-user"},
            )
            assert r.status_code == 404

            # non-author non-collaborator cannot manage assignees
            outsider_token = token_for(outsider)
            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue['number']}/assignees",
                headers=auth(outsider_token), json={"username": owner},
            )
            # private repo: outsider can't even view -> 403
            assert r.status_code == 403

            r = client.delete(
                f"/issues/{owner}/{repo_name}/{issue['number']}/assignees/{collab}",
                headers=auth(token),
            )
            assert r.status_code == 200, r.text
            assert r.json() == {"username": collab}

            # removing again -> 404
            r = client.delete(
                f"/issues/{owner}/{repo_name}/{issue['number']}/assignees/{collab}",
                headers=auth(token),
            )
            assert r.status_code == 404
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(collab, unique("junk"))
            cleanup_repo(outsider, unique("junk"))

    def test_assignee_can_manage_own_issue_assignments(self, client, server_url):
        owner = unique("asg")
        author = unique("asg")
        repo_name = unique("asg")
        try:
            _, owner_token = seed_private_repo(owner, repo_name)
            author_token = seed_other(author)
            add_collaborator(owner, repo_name, token_for(owner), author)
            issue = create_issue(client, f"{owner}/{repo_name}", author_token)

            # collaborator is issue author -> may self-assign
            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue['number']}/assignees",
                headers=auth(author_token), json={"username": author},
            )
            assert r.status_code == 201, r.text
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(author, unique("junk"))


class TestIssueLabels:
    def test_label_attach_flow(self, client, server_url):
        owner = unique("lbl")
        repo_name = unique("lbl")
        try:
            _, token = seed_private_repo(owner, repo_name)
            issue = create_issue(client, f"{owner}/{repo_name}", token)
            issue2 = create_issue(client, f"{owner}/{repo_name}", token)
            name = unique("bug")

            # attach creates the label on first use
            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue['number']}/labels",
                headers=auth(token), json={"name": name, "color": "#ff0000"},
            )
            assert r.status_code == 201, r.text
            created = r.json()
            assert created["name"] == name and created["color"] == "#ff0000"

            # same name+color -> reuses existing label, idempotent
            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue['number']}/labels",
                headers=auth(token), json={"name": name, "color": "#ff0000"},
            )
            assert r.status_code == 201, r.text
            assert r.json()["id"] == created["id"]

            # same name, different color -> rejected
            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue2['number']}/labels",
                headers=auth(token), json={"name": name, "color": "#00ff00"},
            )
            assert r.status_code == 400

            # second issue shares the label once color matches
            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue2['number']}/labels",
                headers=auth(token), json={"name": name, "color": "#ff0000"},
            )
            assert r.status_code == 201, r.text
            assert r.json()["id"] == created["id"]

            r = client.get(
                f"/issues/{owner}/{repo_name}/{issue['number']}/labels", headers=auth(token)
            )
            assert [l["id"] for l in r.json()] == [created["id"]]

            # unknown issue -> 404
            r = client.post(
                f"/issues/{owner}/{repo_name}/999999/labels",
                headers=auth(token), json={"name": name, "color": "#ff0000"},
            )
            assert r.status_code == 404

            # detach; other issue keeps it until detached too
            r = client.delete(
                f"/issues/{owner}/{repo_name}/{issue['number']}/labels/{created['id']}",
                headers=auth(token),
            )
            assert r.status_code == 200, r.text
            assert r.json()["id"] == created["id"]
            r = client.delete(
                f"/issues/{owner}/{repo_name}/{issue['number']}/labels/{created['id']}",
                headers=auth(token),
            )
            assert r.status_code == 404

            # unauthenticated attach -> 401/403
            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue['number']}/labels",
                json={"name": name},
            )
            assert r.status_code in (401, 403)
        finally:
            cleanup_repo(owner, repo_name)


class TestIssueCloseByAssignee:
    def test_assignee_without_repo_access_can_close(self, client, server_url):
        owner = unique("cls")
        collab = unique("cls")
        repo_name = unique("cls")
        try:
            _, token = seed_repo_and_token(owner, repo_name)
            seed_other(collab)
            issue = create_issue(client, f"{owner}/{repo_name}", token)

            # collaborator-less outsider gets assigned directly
            r = client.post(
                f"/issues/{owner}/{repo_name}/{issue['number']}/assignees",
                headers=auth(token), json={"username": collab},
            )
            assert r.status_code == 201, r.text

            # not a collaborator, but assignee -> can close
            r = client.patch(
                f"/issues/{owner}/{repo_name}/{issue['number']}",
                headers=auth(token_for(collab)),
            )
            assert r.status_code == 200, r.text
            assert r.json()["state"] == "closed"
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(collab, unique("junk"))

    def test_unassigned_outsider_cannot_close(self, client, server_url):
        owner = unique("cls")
        other = unique("cls")
        repo_name = unique("cls")
        try:
            _, owner_token = seed_private_repo(owner, repo_name)
            seed_other(other)
            issue = create_issue(client, f"{owner}/{repo_name}", owner_token)

            r = client.patch(
                f"/issues/{owner}/{repo_name}/{issue['number']}",
                headers=auth(token_for(other)),
            )
            assert r.status_code == 403
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(other, unique("junk"))
