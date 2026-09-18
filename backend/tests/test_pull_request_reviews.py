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
        junk_r = unique("junk4")
        try:
            _, token = seed_repo_and_token(owner, repo_name)
            seed_repo(reviewer, junk_r)
            reviewer_token = token_for(reviewer)
            # make reviewer privileged (Maintainer) so they can use APPROVED
            r = client.post(f"/collaborators/{owner}/{repo_name}", json={"identifier": reviewer, "role": "Maintainer"}, headers=auth(token))
            assert r.status_code == 201, r.text
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
            r = client.post(reviews_base, json={"decision": "APPROVED", "body": "looks good"},
                            headers=auth(reviewer_token))
            assert r.status_code == 201, r.text
            review = r.json()
            assert review["reviewer_username"] == reviewer
            assert review["decision"] == "APPROVED"
            assert review["reviewed_at"] is not None

            assert client.get(reviews_base, headers=auth(token)).status_code == 200
            got = client.get(f"{reviews_base}/{review['id']}", headers=auth(token))
            assert got.status_code == 200 and got.json()["id"] == review["id"]

            # only reviewer can update
            r = client.patch(f"{reviews_base}/{review['id']}",
                             json={"body": "nope"}, headers=auth(token))
            assert r.status_code == 403
            r = client.patch(f"{reviews_base}/{review['id']}",
                             json={"decision": "REQUEST_CHANGES"}, headers=auth(reviewer_token))
            assert r.status_code == 200
            assert r.json()["decision"] == "REQUEST_CHANGES"

            # non-reviewer, non-collaborator cannot delete
            assert client.delete(f"{reviews_base}/{review['id']}",
                                 headers=auth(intruder_token)).status_code == 403
            # repo owner (write access) may delete
            assert client.delete(f"{reviews_base}/{review['id']}",
                                 headers=auth(token)).status_code == 204
        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(reviewer, junk_r)
            cleanup_repo(intruder, junk_i)

    def test_review_privilege_enforced(self, client, server_url):
        owner = unique("rvp")
        repo_name = unique("rvp")
        member = unique("rvp")
        viewer = unique("rvp")
        admin = unique("rvp")
        junk_m = unique("junkm")
        junk_v = unique("junkv")
        junk_a = unique("junka")
        try:
            _, owner_token = seed_repo_and_token(owner, repo_name)
            seed_repo(member, junk_m)
            member_token = token_for(member)
            seed_repo(viewer, junk_v)
            viewer_token = token_for(viewer)
            seed_repo(admin, junk_a)
            admin_token = token_for(admin)
            # add collaborators with different roles
            for ident, role in [(member, "Member"), (viewer, "Viewer"), (admin, "Admin")]:
                # Viewer needs private repo
                if role == "Viewer":
                    client.patch(f"/repositories/{owner}/{repo_name}", json={"is_private": True}, headers=auth(owner_token))
                r = client.post(f"/collaborators/{owner}/{repo_name}", json={"identifier": ident, "role": role}, headers=auth(owner_token))
                assert r.status_code == 201, f"{ident} {role} {r.text}"
            url = repo_url(server_url, owner, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"rvp_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
            run_git(clone, "checkout", "-b", "feature")
            make_commit(clone, "b.txt", "b", "feature work")
            push_branch(url, clone, "feature")
            pr = make_pr(f"{owner}/{repo_name}", owner_token, "feature", "main")
            reviews_base = f"/pulls/{owner}/{repo_name}/{pr['id']}/reviews"

            # Member cannot use privileged decisions
            for dec in ["APPROVED", "REQUEST_CHANGES", "REJECTED"]:
                r = client.post(reviews_base, json={"decision": dec, "body": "try"}, headers=auth(member_token))
                assert r.status_code == 403, f"Member {dec} should be 403 got {r.status_code} {r.text}"
                assert "Only owner" in r.text

            # Viewer cannot use privileged decisions
            for dec in ["APPROVED", "REJECTED"]:
                r = client.post(reviews_base, json={"decision": dec, "body": "try"}, headers=auth(viewer_token))
                assert r.status_code == 403, f"Viewer {dec} should be 403"

            # Member can comment
            r = client.post(reviews_base, json={"decision": "COMMENTED", "body": "a comment"}, headers=auth(member_token))
            assert r.status_code == 201, r.text
            assert r.json()["decision"] == "COMMENTED"
            # strict: COMMENT alias should be rejected (422), lower case also rejected
            r = client.post(reviews_base, json={"decision": "COMMENT", "body": "alias"}, headers=auth(member_token))
            assert r.status_code == 422, f"COMMENT should be strict 422 got {r.status_code} {r.text}"
            r = client.post(reviews_base, json={"decision": "approved", "body": "lower"}, headers=auth(member_token))
            assert r.status_code == 422, f"lower case should be 422 got {r.status_code} {r.text}"

            # Viewer can also comment (after being Viewer)
            r = client.post(reviews_base, json={"decision": "COMMENTED", "body": "viewer comment"}, headers=auth(viewer_token))
            assert r.status_code == 201, r.text

            # Admin can do all privileged decisions
            for dec in ["APPROVED", "REQUEST_CHANGES", "REJECTED", "COMMENTED"]:
                r = client.post(reviews_base, json={"decision": dec, "body": "admin ok"}, headers=auth(admin_token))
                assert r.status_code == 201, f"Admin {dec} failed {r.text}"
                assert r.json()["decision"] == dec

            # Owner can also
            r = client.post(reviews_base, json={"decision": "APPROVED", "body": "owner"}, headers=auth(owner_token))
            assert r.status_code == 201

            # Member trying to update their own comment to APPROVED should be forbidden
            # create a comment as member
            r = client.post(reviews_base, json={"decision": "COMMENTED", "body": "to update"}, headers=auth(member_token))
            mid = r.json()["id"]
            r = client.patch(f"{reviews_base}/{mid}", json={"decision": "APPROVED"}, headers=auth(member_token))
            assert r.status_code == 403

        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(member, junk_m)
            cleanup_repo(viewer, junk_v)
            cleanup_repo(admin, junk_a)

    def test_db_trigger_blocks_unprivileged(self, client, server_url):
        import asyncpg, asyncio
        from services.database import DATABASE_URL
        owner = unique("rvt")
        repo_name = unique("rvt")
        member = unique("rvt")
        junk_db = unique("junkdb")
        try:
            _, owner_token = seed_repo_and_token(owner, repo_name)
            seed_repo(member, junk_db)
            member_token = token_for(member)
            r = client.post(f"/collaborators/{owner}/{repo_name}", json={"identifier": member, "role": "Member"}, headers=auth(owner_token))
            assert r.status_code == 201
            url = repo_url(server_url, owner, repo_name, GIT_PASSWORD)
            clone = TMP_DIR / f"rvt_{repo_name}"
            clone_and_push(url, clone, lambda d: make_commit(d, "a.txt", "a", "base"))
            run_git(clone, "checkout", "-b", "feature")
            make_commit(clone, "b.txt", "b", "feature work")
            push_branch(url, clone, "feature")
            pr = make_pr(f"{owner}/{repo_name}", owner_token, "feature", "main")

            async def _raw_insert():
                conn = await asyncpg.connect(DATABASE_URL)
                try:
                    # resolve ids
                    pr_id = pr["id"]
                    mem_id = await conn.fetchval("SELECT id FROM users WHERE username=$1", member)
                    repo_id = await conn.fetchval("SELECT id FROM repositories WHERE name=$1", repo_name)
                    # try privileged decision as member -> should raise
                    try:
                        await conn.execute("INSERT INTO pr_reviews (pull_request_id, reviewer_id, decision, body) VALUES ($1,$2,$3,$4)", pr_id, mem_id, "APPROVED", "trigger test")
                        return False
                    except asyncpg.exceptions.RaiseError as e:
                        if "Only owner" not in str(e):
                            raise
                        return True
                    except asyncpg.PostgresError as e:
                        if "Only owner" not in str(e):
                            raise
                        return True
                finally:
                    await conn.close()
            import concurrent.futures
            # run async
            import asyncio
            loop = asyncio.new_event_loop()
            blocked = loop.run_until_complete(_raw_insert())
            loop.close()
            assert blocked, "DB trigger should block non-privileged APPROVED"

            # COMMENTED should be allowed via raw insert
            async def _raw_comment():
                conn = await asyncpg.connect(DATABASE_URL)
                try:
                    pr_id = pr["id"]
                    mem_id = await conn.fetchval("SELECT id FROM users WHERE username=$1", member)
                    await conn.execute("INSERT INTO pr_reviews (pull_request_id, reviewer_id, decision, body) VALUES ($1,$2,$3,$4)", pr_id, mem_id, "COMMENTED", "ok comment")
                    # cleanup
                    await conn.execute("DELETE FROM pr_reviews WHERE pull_request_id=$1 AND reviewer_id=$2 AND body=$3", pr_id, mem_id, "ok comment")
                    return True
                finally:
                    await conn.close()
            loop = asyncio.new_event_loop()
            ok = loop.run_until_complete(_raw_comment())
            loop.close()
            assert ok

        finally:
            cleanup_repo(owner, repo_name)
            cleanup_repo(member, junk_db)