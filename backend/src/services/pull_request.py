import asyncpg

from schemas.pull_request import (
    PullRequestCreateRequest,
    PullRequestResponse,
    PullRequestUpdateRequest,
    ReviewCreateRequest,
    ReviewResponse,
    ReviewUpdateRequest,
)
from sqls.pull_request_sqls import (
    CREATE_PULL_REQUEST,
    GET_ALL_PULL_REQUESTS,
    GET_PULL_REQUEST_BY_ID,
    UPDATE_PULL_REQUEST,
    DELETE_PULL_REQUEST,
    GET_BRANCH_REF,
    GET_REPO_BY_ID,
    GET_USERNAME_SQL,
    CREATE_PR_REVIEW,
    GET_PR_REVIEWS,
    GET_PR_REVIEW,
    UPDATE_PR_REVIEW,
    DELETE_PR_REVIEW,
)

async def _branch_exists(pool: asyncpg.Pool, repo_id: int, branch: str) -> bool:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            GET_BRANCH_REF, repo_id, f"refs/heads/{branch}"
        )
        return row is not None

async def create_pull_request(
    pool: asyncpg.Pool,
    author_id: int,
    author_username: str,
    target_r: dict,
    payload: PullRequestCreateRequest,
) -> PullRequestResponse:
    if payload.source_repository_id is not None:
        async with pool.acquire() as conn:
            src = await conn.fetchrow(GET_REPO_BY_ID, payload.source_repository_id)
        if src is None:
            raise ValueError("Source repository not found")
        if src["id"] != target_r["id"] and src["parent_repository_id"] != target_r["id"]:
            raise ValueError("Source repository is not a fork of the target repository")
    else:
        if payload.source_branch == payload.target_branch:
            raise ValueError("Source and target branch must be different")

    source_repo_id = payload.source_repository_id or target_r["id"]
    if not await _branch_exists(pool, source_repo_id, payload.source_branch):
        raise ValueError(f"Source branch '{payload.source_branch}' does not exist")
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

async def get_all_pull_requests(pool: asyncpg.Pool, repository_id: int) -> list[PullRequestResponse]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_ALL_PULL_REQUESTS, repository_id)
        return [PullRequestResponse(**dict(r)) for r in rows]

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

async def create_pr_review(
    pool: asyncpg.Pool, pull_request_id: int, reviewer_id: int, payload: ReviewCreateRequest
) -> ReviewResponse:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            CREATE_PR_REVIEW, pull_request_id, reviewer_id, payload.decision, payload.body
        )
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
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            UPDATE_PR_REVIEW, review_id, pull_request_id, payload.decision, payload.body
        )
        if row is None:
            return None
        return ReviewResponse(**dict(row))

async def delete_pr_review(pool: asyncpg.Pool, pull_request_id: int, review_id: int) -> bool:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(DELETE_PR_REVIEW, review_id, pull_request_id)
        return row is not None
