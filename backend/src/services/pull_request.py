import asyncpg
from fastapi import HTTPException
from auth.permission import is_privileged_on_repo, can_push_to_branch_by_id
from services.repository_collaborator import get_collaborator_details
from models.git import EMPTY_TREE_SHA_HEX
from services.git_read import get_diff
from sqls.git_sqls import GET_PARENTS
from sqls.pull_request_sqls import GET_BRANCH_REF as _BR, GET_COMMIT_FOR_COPY as _GC
from typing import List

from schemas.pull_request import (
    PullRequestCreateRequest,
    PullRequestResponse,
    PullRequestUpdateRequest,
    ReviewCreateRequest,
    ReviewResponse,
    ReviewUpdateRequest,
    IssuePullRequestCreateRequest,
    IssueRef,
    PullRef,
)
from sqls.pull_request_sqls import (
    CREATE_PULL_REQUEST,
    CREATE_ISSUE_PR,
    LINK_ISSUE_PR,
    GET_ALL_PULL_REQUESTS,
    GET_PULL_REQUEST_BY_ID,
    GET_PULL_ISSUES,
    GET_ISSUE_PRS,
    UPDATE_PULL_REQUEST,
    DELETE_PULL_REQUEST,
    GET_BRANCH_REF,
    REF_EXISTS,
    GET_REPO_BY_ID,
    GET_USERNAME_SQL,
    CREATE_PR_REVIEW,
    GET_PR_REVIEWS,
    GET_PR_REVIEW,
    UPDATE_PR_REVIEW,
    DELETE_PR_REVIEW,
    CHECK_REVIEWS_FOR_MERGE
)

async def _branch_exists(pool: asyncpg.Pool, repo_id: int, branch: str) -> bool:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            GET_BRANCH_REF, repo_id, f"refs/heads/{branch}"
        )
        return row is not None and bool(row[0])

async def _source_head(pool: asyncpg.Pool, repo_id: int, branch: str) -> str | None:
    async with pool.acquire() as conn:
        exists = await conn.fetchval(REF_EXISTS, repo_id, f"refs/heads/{branch}")
        if not exists:
            raise ValueError(f"Source branch '{branch}' does not exist")
        return await conn.fetchval(GET_BRANCH_REF, repo_id, f"refs/heads/{branch}")

async def create_pull_request(
    pool: asyncpg.Pool,
    author_id: int,
    author_username: str,
    target_r: dict,
    payload: PullRequestCreateRequest,
) -> PullRequestResponse:

    async with pool.acquire() as conn:
        target = await conn.fetchrow(GET_REPO_BY_ID, target_r["id"])
    if target is None:
        raise ValueError("Target repository not found")
    is_cross = payload.source_repository_id is not None and payload.source_repository_id != target["id"]
    if is_cross:
        async with pool.acquire() as conn:
            src = await conn.fetchrow(GET_REPO_BY_ID, payload.source_repository_id)
        if src is None:
            raise ValueError("Source repository not found")
        if src["is_private"]:
            raise ValueError("Private repositories cannot be used as source for another repository")
        if src["id"] != target["id"] and src["parent_repository_id"] != target["id"]:
            raise ValueError("Source repository is not a fork of the target repository")
        if not await is_privileged_on_repo(pool, src["id"], src["owner_id"], author_id):
            raise PermissionError("Only owner, admin, or maintainer of the source repository can open this pull request")
    else:
        if payload.source_branch == payload.target_branch:
            raise ValueError("Source and target branch must be different")
        if target["owner_id"] != author_id:
            collaborator = await get_collaborator_details(pool, target["id"], author_id)
            if collaborator is None or collaborator.role == 'Viewer':
                raise PermissionError("Only collaborators can open pull requests on this repository")
            if collaborator.role not in ('Admin', 'Maintainer'):
                allowed = await can_push_to_branch_by_id(
                    pool, target["id"], target["owner_id"], payload.source_branch, author_id
                )
                if not allowed:
                    raise PermissionError("You do not have permission to open a pull request from this branch")

    source_repo_id = payload.source_repository_id or target_r["id"]
    if not await _source_head(pool, source_repo_id, payload.source_branch):
        raise ValueError(f"Source branch '{payload.source_branch}' has no commits")
    if not await _branch_exists(pool, target_r["id"], payload.target_branch):
        raise ValueError(f"Target branch '{payload.target_branch}' does not exist")

    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                CREATE_PULL_REQUEST,
                target_r["id"],
                author_id,
                payload.title or "",
                payload.body,
                payload.source_branch,
                payload.target_branch,
                payload.source_repository_id,
            )
    except asyncpg.PostgresError as e:
        raise ValueError(f"Database error: {str(e)}")

    data = dict(row)
    data["author_username"] = author_username
    return PullRequestResponse(**data)

async def create_issue_pull_request(
    pool: asyncpg.Pool,
    author_id: int,
    author_username: str,
    target_r: dict,
    payload: IssuePullRequestCreateRequest,
) -> PullRequestResponse:

    async with pool.acquire() as conn:
        target = await conn.fetchrow(GET_REPO_BY_ID, target_r["id"])
    if target is None:
        raise ValueError("Target repository not found")
    is_cross = payload.source_repository_id is not None and payload.source_repository_id != target["id"]
    if is_cross:
        async with pool.acquire() as conn:
            src = await conn.fetchrow(GET_REPO_BY_ID, payload.source_repository_id)
        if src is None:
            raise ValueError("Source repository not found")
        if src["is_private"]:
            raise ValueError("Private repositories cannot be used as source for another repository")
        if src["id"] != target["id"] and src["parent_repository_id"] != target["id"]:
            raise ValueError("Source repository is not a fork of the target repository")
        if not await is_privileged_on_repo(pool, src["id"], src["owner_id"], author_id):
            raise PermissionError("Only owner, admin, or maintainer of the source repository can open this pull request")
    else:
        if payload.source_branch == payload.target_branch:
            raise ValueError("Source and target branch must be different")
        if target["owner_id"] != author_id:
            collaborator = await get_collaborator_details(pool, target["id"], author_id)
            if collaborator is None or collaborator.role == 'Viewer':
                raise PermissionError("Only collaborators can open pull requests on this repository")
            if collaborator.role not in ('Admin', 'Maintainer'):
                allowed = await can_push_to_branch_by_id(
                    pool, target["id"], target["owner_id"], payload.source_branch, author_id
                )
                if not allowed:
                    raise PermissionError("You do not have permission to open a pull request from this branch")

    source_repo_id = payload.source_repository_id or target_r["id"]
    if not await _source_head(pool, source_repo_id, payload.source_branch):
        raise ValueError(f"Source branch '{payload.source_branch}' has no commits")
    if not await _branch_exists(pool, target_r["id"], payload.target_branch):
        raise ValueError(f"Target branch '{payload.target_branch}' does not exist")

    # Fast fail before creating the PR: linked issues must exist and belong
    # to the target repo. DB trigger validate_issue_pull_request_same_repo()
    # enforces the same rule on write as backstop.
    async with pool.acquire() as conn:
        for i in payload.issue_ids:
            issue_row = await conn.fetchrow(
                "SELECT repository_id FROM issues WHERE id=$1", i
            )
            if issue_row is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Issue {i} does not exist"
                )
            if issue_row["repository_id"] != target_r["id"]:
                raise HTTPException(
                    status_code=400,
                    detail="Issue and pull request must belong to same repository"
                )

    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                CREATE_PULL_REQUEST,
                target_r["id"],
                author_id,
                payload.title or "",
                payload.body,
                payload.source_branch,
                payload.target_branch,
                payload.source_repository_id,
            )
            
            for i in payload.issue_ids:
                issue_pr = await conn.fetchrow(
                    CREATE_ISSUE_PR,
                    i, row["id"]
                )
                if issue_pr is None:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Issue {i} not found"
                    )
    except asyncpg.ForeignKeyViolationError:
            raise HTTPException(
                status_code=404,
                detail=f"Issue {i} does not exist"
            )
    except asyncpg.PostgresError as e:
        msg = str(e)
        if "same repository" in msg:
            raise HTTPException(
                status_code=400,
                detail="Issue and pull request must belong to same repository"
            )
        raise ValueError(f"Database error: {msg}")

    data = dict(row)
    data["author_username"] = author_username
    return PullRequestResponse(**data)

async def get_pull_files(pool: asyncpg.Pool, pr: PullRequestResponse) -> list[dict]:
    source_repo_id = pr.source_repository_id or pr.repository_id

    async def head(repo_id: int, branch: str) -> str | None:
        async with pool.acquire() as conn:
            return await conn.fetchval(_BR, repo_id, f"refs/heads/{branch}")

    async def ancestors(repo_id: int, start: str) -> set[str]:
        seen: set[str] = set()
        stack = [start]
        async with pool.acquire() as conn:
            while stack:
                batch = [s for s in stack if s not in seen]
                if not batch:
                    break
                seen.update(batch)
                rows = await conn.fetch(GET_PARENTS, repo_id, batch)
                stack = [r["parent_sha"] for r in rows if r["parent_sha"] not in seen]
        return seen

    async def commit_tree(repo_id: int, sha: str) -> str | None:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(_GC, repo_id, sha)
        return row["root_tree_sha"] if row else None

    source_head = await head(source_repo_id, pr.source_branch)
    target_head = await head(pr.repository_id, pr.target_branch)
    if source_head is None:
        raise ValueError(f"Source branch '{pr.source_branch}' does not exist")
    if target_head is None:
        raise ValueError(f"Target branch '{pr.target_branch}' does not exist")
    if source_head == target_head:
        return []
    src_anc = await ancestors(source_repo_id, source_head)
    base: str | None = None
    seen: set[str] = set()
    stack = [target_head]
    async with pool.acquire() as conn:
        while stack:
            batch = [s for s in stack if s not in seen]
            if not batch:
                break
            seen.update(batch)
            for s in batch:
                if s in src_anc:
                    base = s
                    stack = []
                    break
            if base is not None:
                break
            rows = await conn.fetch(GET_PARENTS, pr.repository_id, batch)
            stack = [r["parent_sha"] for r in rows if r["parent_sha"] not in seen]
    base_tree = None
    if base is not None:
        base_tree = await commit_tree(source_repo_id, base) or await commit_tree(pr.repository_id, base)
    source_tree = await commit_tree(source_repo_id, source_head)
    if source_tree is None:
        raise ValueError("Source head commit not found")
    return await get_diff(pool, source_repo_id, base_tree or EMPTY_TREE_SHA_HEX, source_tree)


async def get_all_pull_requests(pool: asyncpg.Pool, repository_id: int) -> List[PullRequestResponse]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_ALL_PULL_REQUESTS, repository_id)
        return [PullRequestResponse(**dict(r)) for r in rows]

async def get_pull_issues(pool: asyncpg.Pool, pr_id : int) -> List[IssueRef]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_PULL_ISSUES, pr_id)
        return [IssueRef(**dict(r)) for r in rows]

async def get_issue_pulls(pool: asyncpg.Pool, issue_id: int) -> List[PullRef]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_ISSUE_PRS, issue_id)
        return [PullRef(**dict(r)) for r in rows]

async def link_issue_to_pull(
    pool: asyncpg.Pool, repository_id: int, pull_request_id: int, issue_id: int
) -> IssueRef:
    async with pool.acquire() as conn:
        pr_repo = await conn.fetchval(
            "SELECT repository_id FROM pull_requests WHERE id=$1", pull_request_id
        )
        if pr_repo is None:
            raise HTTPException(status_code=404, detail="Pull request not found")
        if pr_repo != repository_id:
            raise HTTPException(status_code=404, detail="Pull request not found")
        issue_row = await conn.fetchrow(
            "SELECT id, number, title, state, created_at, repository_id FROM issues WHERE id=$1",
            issue_id,
        )
        if issue_row is None:
            raise HTTPException(status_code=404, detail=f"Issue {issue_id} does not exist")
        if issue_row["repository_id"] != repository_id:
            raise HTTPException(
                status_code=400,
                detail="Issue and pull request must belong to same repository",
            )
        try:
            await conn.execute(LINK_ISSUE_PR, issue_id, pull_request_id)
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=409, detail="Issue already linked to this pull request")
        except asyncpg.PostgresError as e:
            msg = str(e)
            if "same repository" in msg:
                raise HTTPException(
                    status_code=400,
                    detail="Issue and pull request must belong to same repository",
                )
            raise ValueError(f"Database error: {msg}")
        return IssueRef(
            id=issue_row["id"],
            number=issue_row["number"],
            title=issue_row["title"],
            state=issue_row["state"],
            created_at=issue_row["created_at"],
        )

async def get_pull_request(
    pool: asyncpg.Pool, repository_id: int, pull_request_id: int
) -> PullRequestResponse | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_PULL_REQUEST_BY_ID, repository_id, pull_request_id)
        if row is None:
            return None
        return PullRequestResponse(**dict(row))

async def update_pull_request(
    pool: asyncpg.Pool, repository_id: int, pull_request_id: int, payload: PullRequestUpdateRequest
) -> PullRequestResponse | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            UPDATE_PULL_REQUEST, pull_request_id, repository_id, payload.title, payload.body, payload.state
        )
        if row is None:
            return None
        return PullRequestResponse(**dict(row))

async def delete_pull_request(pool: asyncpg.Pool, repository_id: int, pull_request_id: int) -> bool:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(DELETE_PULL_REQUEST, pull_request_id, repository_id)
        return row is not None

async def _enforce_review_privilege(
    pool: asyncpg.Pool, pull_request_id: int, reviewer_id: int, decision: str
) -> str:
    # strict: no normalization, decision must be exact
    # COMMENTED is allowed for everyone; privileged decisions require Owner/Admin/Maintainer
    if decision in ("APPROVED", "REQUEST_CHANGES", "REJECTED"):
        # resolve repo for privilege check
        async with pool.acquire() as conn:
            pr_row = await conn.fetchrow("SELECT repository_id FROM pull_requests WHERE id=$1", pull_request_id)
            if pr_row is None:
                raise ValueError("Pull request not found")
            repo_id = pr_row["repository_id"]
            repo = await conn.fetchrow("SELECT owner_id FROM repositories WHERE id=$1", repo_id)
            if repo is None:
                raise ValueError("Repository not found")
            owner_id = repo["owner_id"]
        if not await is_privileged_on_repo(pool, repo_id, owner_id, reviewer_id):
            raise PermissionError(f"Only owner, admin, or maintainer can use decision {decision}")
    return decision


async def create_pr_review(
    pool: asyncpg.Pool, pull_request_id: int, reviewer_id: int, payload: ReviewCreateRequest
) -> ReviewResponse:
    decision = await _enforce_review_privilege(pool, pull_request_id, reviewer_id, payload.decision)
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                CREATE_PR_REVIEW, pull_request_id, reviewer_id, decision, payload.body
            )
        except asyncpg.exceptions.InsufficientPrivilegeError as e:
            raise PermissionError(str(e))
        except asyncpg.exceptions.RaiseError as e:
            # DB trigger raised insufficient privilege / check violation
            msg = str(e)
            if "Only owner" in msg:
                raise PermissionError(msg)
            raise ValueError(msg)
        except asyncpg.PostgresError as e:
            msg = str(e)
            if "Only owner" in msg:
                raise PermissionError(msg)
            raise
        data = dict(row)
    async with pool.acquire() as conn:
        r = await conn.fetchrow(GET_USERNAME_SQL, reviewer_id)
    data["reviewer_username"] = r["username"] if r else None
    return ReviewResponse(**data)

async def get_pr_reviews(pool: asyncpg.Pool, pull_request_id: int) -> list[ReviewResponse]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_PR_REVIEWS, pull_request_id)
        return [ReviewResponse(**dict(r)) for r in rows]

async def get_pr_review(
    pool: asyncpg.Pool, pull_request_id: int, review_id: int
) -> ReviewResponse | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_PR_REVIEW, pull_request_id, review_id)
        if row is None:
            return None
        return ReviewResponse(**dict(row))

async def update_pr_review(
    pool: asyncpg.Pool, pull_request_id: int, review_id: int, payload: ReviewUpdateRequest
) -> ReviewResponse | None:
    decision = payload.decision
    if decision is not None:
        # need reviewer_id to check privilege
        async with pool.acquire() as conn:
            rev = await conn.fetchrow("SELECT reviewer_id FROM pr_reviews WHERE id=$1 AND pull_request_id=$2", review_id, pull_request_id)
            if rev is None:
                return None
            reviewer_id = rev["reviewer_id"]
        decision = await _enforce_review_privilege(pool, pull_request_id, reviewer_id, decision)  # type: ignore[arg-type]
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                UPDATE_PR_REVIEW, review_id, pull_request_id, decision, payload.body
            )
        except asyncpg.exceptions.RaiseError as e:
            msg = str(e)
            if "Only owner" in msg:
                raise PermissionError(msg)
            raise ValueError(msg)
        except asyncpg.PostgresError as e:
            msg = str(e)
            if "Only owner" in msg:
                raise PermissionError(msg)
            raise
        if row is None:
            return None
        return ReviewResponse(**dict(row))

async def delete_pr_review(pool: asyncpg.Pool, pull_request_id: int, review_id: int) -> bool:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(DELETE_PR_REVIEW, review_id, pull_request_id)
        return row is not None

async def check_pr_for_merge(
    pool: asyncpg.Pool,
    pull_request_id: int,
) -> bool:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(CHECK_REVIEWS_FOR_MERGE, pull_request_id)
        return not row["is_blocked"] if row else False
