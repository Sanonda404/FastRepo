from pathlib import Path

import httpx
import pytest

from test_pull_requests import (
    TMP_DIR,
    GIT_PASSWORD,
    repo_url,
    run_git,
    seed_repo,
    cleanup_repo,
    make_commit,
    unique,
    client,
    server_url,
    token_for,
    auth,
    seed_repo_and_token,
    clone_and_push,
    push_branch,
    make_pr,
)


class TestPullRequestReviews:
    def test_reviews_crud(self, client, server_url):
        owner = unique("rv")
        repo_name = unique("rv")
        reviewer = unique("rv")
        intruder = unique("rv")
        junk_i = unique("junk5")
        try:
            _, token = seed_repo_and_token(owner, repo_name)
            seed_repo(reviewer, unique("junk4"))
            reviewer_token = token_for(reviewer)
            seed_repo(intruder, junk_i)
            intruder_token = token_for(intruder)
            url = repo_url(server_url, owner, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"rv_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
            run_git(clone, "checkout", "-b", "feature")
            make_commit(clone, "b.txt", "b", "feature work")
            push_branch(url, clone, "feature")
            pr = make_pr(f"{owner}/{repo_name}", token, "feature", "main")

            reviews_base = f"/pulls/{owner}/{repo_name}/{pr['id']}/reviews"
            r = client.post(reviews_base, json={"decision": "approved", "body": "looks good"},
                            headers=auth(reviewer_token))
            assert r.status_code == 201, r.text
            review = r.json()
            assert review["reviewer_username"] == reviewer
            assert review["decision"] == "approved"
            assert review["reviewed_at"] is not None

            assert client.get(reviews_base, headers=auth(token)).status_code == 200
            got = client.get(f"{reviews_base}/{review['id']}", headers=auth(token))
            assert got.status_code == 200 and got.json()["id"] == review["id"]

            # only reviewer can update
            r = client.patch(f"{reviews_base}/{review['id']}",
                             json={"body": "nope"}, headers=auth(token))
            assert r.status_code == 403
            r = client.patch(f"{reviews_base}/{review['id']}",
                             json={"decision": "changes_requested"}, headers=auth(reviewer_token))
            assert r.status_code == 200
            assert r.json()["decision"] == "changes_requested"

            # non-reviewer, non-collaborator cannot delete
            assert client.delete(f"{reviews_base}/{review['id']}",
                                 headers=auth(intruder_token)).status_code == 403
            # repo owner (write access) may delete
            assert client.delete(f"{reviews_base}/{review['id']}",
                                 headers=auth(token)).status_code == 204
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(reviewer, unique("junk4"))
            cleanup_repo(intruder, junk_i)