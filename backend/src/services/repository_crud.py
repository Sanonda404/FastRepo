import asyncpg
from fastapi import HTTPException

from schemas.repository import RepositoryCreateRequest, RepositoryResponse, ForkRepositoryRequest
from sqls.repository_sqls import (
    CREATE_REPOSITORY, 
    GET_REPO_BY_USER_AND_REPOSIRY_NAME, 
    FORK_REPOSITORY, 
    COPY_BRANCHES,
    COPY_COMMITS
)

from sqls.git_sqls import INSERT_COMMIT

async def create_repository(pool: asyncpg.Pool, payload: RepositoryCreateRequest, owner_id : int) -> RepositoryResponse:
    
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                CREATE_REPOSITORY, owner_id, payload.name, payload.description, payload.is_private
            )
            if row is None:
                raise RuntimeError("Failed to create repository")
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
            
            #copy all the branches
            await conn.execute(
                COPY_BRANCHES, new_repo.id, source_repo.id
            )
            
            #connect the commits
            row = await conn.execute(
                COPY_COMMITS, new_repo.id, source_repo.id
            )
            
            return new_repo
        except asyncpg.UniqueViolationError:
            raise ValueError("Repository with same name already exists")
    