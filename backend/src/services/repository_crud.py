import asyncpg
from fastapi import HTTPException
from typing import List
from datetime import datetime, timezone
from dulwich.objects import Commit
from schemas.repository import RepositoryCreateRequest, RepositoryResponse, RepositoryUpdateRequest, ForkRepositoryRequest, StarResponse, RepositoryDetails
from sqls.repository_sqls import (
    CREATE_REPOSITORY, 
    GET_REPO_BY_USER_AND_REPOSIRY_NAME,
    GET_ACCESIBLE_REPOS_OF_OWNER_BY_USERNAME,
    GET_ALL_REPOS_OF_OWNER_BY_OWNER_ID,
    GET_ALL_PUBLIC_OF_OWNER_BY_OWNER_NAME,
    GET_ALL_ACCESIBLE_REPOS_OF_USER_BY_ID,
    GET_LIST_OF_ACCESSIBLE_FORKS,
    CALL_FORK_REPOSITORY,
    UPDATE_REPOSITORY,
    DELETE_REPOSITORY,
    CHECK_REPO_ACCESS,
    GET_STAR,
    INSERT_STAR,
    REMOVE_STAR,
    GET_REPOSITORY_STAR_COUNT,
    GET_STARGAZERS,
    GET_STARRED_REPOS_OF_USER
)
from sqls.git_sqls import SET_SYMREF
from sqls.pull_request_sqls import GET_REPO_BY_ID
from models.git import EMPTY_TREE_SHA

from sqls.git_sqls import INSERT_HEAD_REF, INSERT_COMMIT, UPSERT_REF

async def create_repository(pool: asyncpg.Pool, payload: RepositoryCreateRequest, current_user : dict) -> RepositoryResponse:
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                row = await conn.fetchrow(
                    CREATE_REPOSITORY, current_user["id"], payload.name, payload.description, payload.is_private, payload.default_branch if payload.default_branch != "" else None
                )
                if row is None:
                    raise RuntimeError("Failed to create repository")
                repo_id = row["id"]
                if row["default_branch"]:
                    branch = f"refs/heads/{row['default_branch']}"
                    await conn.execute(
                        INSERT_HEAD_REF,
                        repo_id,
                        branch,
                    )
                    now = int(datetime.now(timezone.utc).timestamp())
                    commit = Commit()
                    commit.tree = EMPTY_TREE_SHA
                    commit.parents = []
                    identity = f"{current_user['username']} <{current_user['email']}>".encode()
                    commit.author = identity
                    commit.committer = identity
                    commit.author_time = now
                    commit.commit_time = now
                    commit.author_timezone = 0
                    commit.commit_timezone = 0
                    commit.message = b"Repository Creation"
                    await conn.execute(
                        INSERT_COMMIT,
                        repo_id,
                        commit.id.decode("ascii"),
                        commit.as_raw_string(),
                        None,
                        current_user["username"],
                        datetime.fromtimestamp(now, tz=timezone.utc),
                        commit.message.decode("ascii"),
                    )
                    await conn.execute(UPSERT_REF, repo_id, branch, commit.id.decode("ascii"))

            return RepositoryResponse(**dict(row))
        except asyncpg.UniqueViolationError:
            raise ValueError("Repository with same name already exists")
        

async def get_repository(pool : asyncpg.Pool, owner_name : str, repo_name: str) -> RepositoryResponse:
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                GET_REPO_BY_USER_AND_REPOSIRY_NAME, owner_name, repo_name
            )
            if row is None:
                raise HTTPException(status_code=404, detail="Repository not found")
            return RepositoryResponse(**dict(row))
        except asyncpg.UniqueViolationError:
            raise ValueError("Repository with same name already exists")

async def list_all_repositories(pool : asyncpg.Pool, owner_id : int) -> List[RepositoryResponse]:
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(
                GET_ALL_REPOS_OF_OWNER_BY_OWNER_ID, owner_id
            )
            res : List[RepositoryResponse] = []
            for row in rows:
                res.append(RepositoryResponse(**dict(row)))
            return res
        except asyncpg.UniqueViolationError:
            raise ValueError("Repository with same name already exists")

async def list_all_accessible_repositories(pool : asyncpg.Pool, owner_name : str, user_id: int) -> List[RepositoryResponse]:
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(
                GET_ACCESIBLE_REPOS_OF_OWNER_BY_USERNAME, owner_name, user_id
            )
            res : List[RepositoryResponse] = []
            for row in rows:
                res.append(RepositoryResponse(**dict(row)))
            return res
        except asyncpg.UniqueViolationError:
            raise ValueError("Repository with same name already exists")

async def list_all_repositories_of_user(pool : asyncpg.Pool, user_id: int) -> List[RepositoryDetails]:
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(
                GET_ALL_ACCESIBLE_REPOS_OF_USER_BY_ID, user_id
            )
            res : List[RepositoryDetails] = []
            for row in rows:
                res.append(RepositoryDetails(**dict(row)))
            return res
        except asyncpg.UniqueViolationError:
            raise ValueError("Repository with same name already exists")

async def list_all_public_repositories(pool : asyncpg.Pool, owner_name : str) -> List[RepositoryResponse]:
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(
                GET_ALL_PUBLIC_OF_OWNER_BY_OWNER_NAME, owner_name
            )
            res : List[RepositoryResponse] = []
            for row in rows:
                res.append(RepositoryResponse(**dict(row)))
            return res
        except asyncpg.UniqueViolationError:
            raise ValueError("Repository with same name already exists")

async def update_repository(pool: asyncpg.Pool, repo_id: int, repo_name: str, payload: RepositoryUpdateRequest) -> RepositoryResponse:
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                exists = await conn.fetchval(
                    "SELECT 1 FROM repositories WHERE id = $1 AND name = $2",
                    repo_id, repo_name,
                )
                if not exists:
                    raise HTTPException(status_code=404, detail="Repository not found")
                if payload.default_branch:
                    branch_ref = f"refs/heads/{payload.default_branch}"
                    exists = await conn.fetchval(
                        "SELECT 1 FROM refs WHERE repo_id = $1 AND name = $2",
                        repo_id, branch_ref,
                    )
                    if not exists:
                        raise ValueError(f"Branch '{payload.default_branch}' does not exist")
                row = await conn.fetchrow(
                    UPDATE_REPOSITORY, repo_id, repo_name, payload.name, payload.description, payload.is_private, payload.default_branch
                )
                if row is None:
                    raise HTTPException(status_code=404, detail="Repository not found")
                if payload.default_branch:
                    await conn.execute(SET_SYMREF, repo_id, "HEAD", f"refs/heads/{payload.default_branch}")
            return RepositoryResponse(**dict(row))
        except asyncpg.UniqueViolationError:
            raise ValueError("Repository with same name already exists")

async def delete_repository(pool: asyncpg.Pool, owner_id: int, repo_name: str) -> None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(DELETE_REPOSITORY, owner_id, repo_name)
        if row is None:
            raise HTTPException(status_code=404, detail="Repository not found")

async def can_access_repository(pool: asyncpg.Pool, repo_id: int, user_id: int) -> bool:
    async with pool.acquire() as conn:
        return bool(await conn.fetchval(CHECK_REPO_ACCESS, repo_id, user_id))

async def fork_repository(pool: asyncpg.Pool, source_repo: RepositoryResponse, payload: ForkRepositoryRequest ,current_user_id: int) -> RepositoryResponse:
    async with pool.acquire() as conn:
        async with conn.transaction():
            try:
                target_name = payload.name or source_repo.name
                target_description = payload.description if payload.description is not None else source_repo.description
                target_is_private = payload.is_private if payload.is_private is not None else source_repo.is_private

                row = await conn.fetchrow(
                    CALL_FORK_REPOSITORY, current_user_id, target_name, target_description, target_is_private, source_repo.default_branch, source_repo.id
                )
                if row is None:
                    raise HTTPException(status_code=500, detail="Fork failed unexpectedly")

                repo_row = await conn.fetchrow(GET_REPO_BY_ID, row["p_new_repo_id"])
                if repo_row is None:
                    raise HTTPException(status_code=404, detail="Repository not found")

                return RepositoryResponse(**dict(repo_row))
            except asyncpg.UniqueViolationError:
                raise ValueError("Repository with same name already exists")
            except asyncpg.PostgresError as e:
                raise HTTPException(status_code=400, detail=f"Database error: {e}")

async def list_fork_repositories(pool : asyncpg.Pool, repo_id : int, user_id: int | None) -> List[RepositoryDetails]:
    async with pool.acquire() as conn:
            try:
                rows = await conn.fetch(
                    GET_LIST_OF_ACCESSIBLE_FORKS, repo_id, user_id
                )
                res : List[RepositoryDetails] = []
                for row in rows:
                    d = dict(row)
                    if "owner_username" not in d:
                        d["owner_username"] = ""
                    d.setdefault("parent_owner_username", None)
                    d.setdefault("parent_repository_name", None)
                    res.append(RepositoryDetails(**d))
                return res
            except asyncpg.UniqueViolationError:
                raise ValueError("Repository with same name already exists")

async def star_repository(pool: asyncpg.Pool, user_id: int, repo_id: int) -> StarResponse:
    async with pool.acquire() as conn:
        async with conn.transaction():
            try:
                await conn.execute(INSERT_STAR, user_id, repo_id)
                is_starred = True
                star_count = await conn.fetchval(GET_REPOSITORY_STAR_COUNT, repo_id) or 0
                return StarResponse(is_starred=is_starred, star_count=star_count)
            except asyncpg.PostgresError:
                raise HTTPException(status_code=500, detail="Database error occurred")

async def unstar_repository(pool: asyncpg.Pool, user_id: int, repo_id: int) -> StarResponse:
    async with pool.acquire() as conn:
        async with conn.transaction():
            try:
                await conn.execute(REMOVE_STAR, user_id, repo_id)
                is_starred = False
                star_count = await conn.fetchval(GET_REPOSITORY_STAR_COUNT, repo_id) or 0
                return StarResponse(is_starred=is_starred, star_count=star_count)
            except asyncpg.PostgresError:
                raise HTTPException(status_code=500, detail="Database error occurred")

async def get_star(pool: asyncpg.Pool, repo_id: int, user_id: int | None) -> StarResponse:
    async with pool.acquire() as conn:
        try:
            is_starred = False
            if user_id is not None:
                is_starred = await conn.fetchval(GET_STAR, user_id, repo_id) is not None
            star_count = await conn.fetchval(GET_REPOSITORY_STAR_COUNT, repo_id) or 0
            return StarResponse(is_starred=is_starred, star_count=star_count)
        except asyncpg.PostgresError:
            raise HTTPException(status_code=500, detail="Database error occurred")

async def list_stargazers(pool: asyncpg.Pool, repo_id: int):
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(GET_STARGAZERS, repo_id)
            return [{"id": r["id"], "username": r["username"], "created_at": r["created_at"]} for r in rows]
        except asyncpg.PostgresError:
            raise HTTPException(status_code=500, detail="Database error occurred")

async def list_starred_repositories(pool: asyncpg.Pool, starred_username: str, viewer_id: int | None) -> List[RepositoryDetails]:
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(GET_STARRED_REPOS_OF_USER, starred_username, viewer_id)
            res: List[RepositoryDetails] = []
            for row in rows:
                res.append(RepositoryDetails(**dict(row)))
            return res
        except asyncpg.PostgresError:
            raise HTTPException(status_code=500, detail="Database error occurred")
