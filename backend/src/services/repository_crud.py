import asyncpg
from fastapi import HTTPException
from datetime import datetime, timezone
from dulwich.objects import Commit

from schemas.repository import RepositoryCreateRequest, RepositoryResponse, RepositoryUpdateRequest, ForkRepositoryRequest
from sqls.repository_sqls import (
    CREATE_REPOSITORY, 
    GET_REPO_BY_USER_AND_REPOSIRY_NAME, 
    FORK_REPOSITORY, 
    COPY_FORK_COMMITS,
    COPY_FORK_BLOBS,
    COPY_FORK_TAGS,
    COPY_FORK_TREE_ENTRIES,
    COPY_FORK_COMMIT_PARENTS,
    COPY_FORK_REFS,
    UPDATE_REPOSITORY,
    DELETE_REPOSITORY,
    CHECK_REPO_ACCESS,
)
from models.git import EMPTY_TREE_SHA

from sqls.git_sqls import INSERT_HEAD_REF, INSERT_COMMIT, SET_SYMREF

async def create_repository(pool: asyncpg.Pool, payload: RepositoryCreateRequest, current_user : dict) -> RepositoryResponse:
    
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                CREATE_REPOSITORY, current_user["id"], payload.name, payload.description, payload.is_private
            )
            if row is None:
                raise RuntimeError("Failed to create repository")
            repo_id = row["id"]
            branch = f"refs/heads/{row['default_branch']}"
            await conn.execute(
                INSERT_HEAD_REF,
                repo_id,
                f"ref: {branch}".encode(),
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
                commit.id,
                commit.as_raw_string(),
                EMPTY_TREE_SHA,
                current_user["username"].encode(),
                datetime.fromtimestamp(now, tz=timezone.utc),
                commit.message,
            )
            await conn.execute(SET_SYMREF, repo_id, branch.encode(), commit.id)
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

async def update_repository(pool: asyncpg.Pool, owner_id: int, repo_name: str, payload: RepositoryUpdateRequest) -> RepositoryResponse:
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                UPDATE_REPOSITORY, owner_id, repo_name, payload.name, payload.description, payload.is_private
            )
            if row is None:
                raise HTTPException(status_code=404, detail="Repository not found")
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
        try:
            target_name = payload.name or source_repo.name
            target_description = payload.description if payload.description is not None else source_repo.description
            target_is_private = payload.is_private if payload.is_private is not None else source_repo.is_private
            
            #create new repository
            row = await conn.fetchrow(
                FORK_REPOSITORY, current_user_id, target_name, target_description, target_is_private, source_repo.default_branch, source_repo.id
            )
            if row is None:
                raise HTTPException(status_code=404, detail="Repository not found")
            
            new_repo = RepositoryResponse(**dict(row))
            
            #copy git objects, refs and parent links to the new repo id
            await conn.execute(COPY_FORK_COMMITS, new_repo.id, source_repo.id)
            await conn.execute(COPY_FORK_BLOBS, new_repo.id, source_repo.id)
            await conn.execute(COPY_FORK_TAGS, new_repo.id, source_repo.id)
            await conn.execute(COPY_FORK_TREE_ENTRIES, new_repo.id, source_repo.id)
            await conn.execute(COPY_FORK_COMMIT_PARENTS, new_repo.id, source_repo.id)
            await conn.execute(COPY_FORK_REFS, new_repo.id, source_repo.id)
            
            return new_repo
        except asyncpg.UniqueViolationError:
            raise ValueError("Repository with same name already exists")
    
