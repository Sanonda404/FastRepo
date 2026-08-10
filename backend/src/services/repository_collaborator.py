import asyncpg
from schemas.repository_collaborator import CollaboratorResponse, CollaboratorAddRequest
from sqls.repository_collaborators_sqls import ADD_COLLABORATOR, GET_ALL_COLLABORATORS, REMOVE_COLLABORATOR
from fastapi import HTTPException


async def add_collaborator_to_repo(pool : asyncpg.Pool, user_id: int, repo_id : int, payload: CollaboratorAddRequest, user : dict) -> CollaboratorResponse:
    async with pool.acquire() as conn:
        try:
            
            row = await conn.fetchrow(
                ADD_COLLABORATOR, repo_id, user_id,payload.role
            )
            if row is None:
                raise HTTPException(status_code=404, detail="Error occured")
            res = CollaboratorResponse(
                id= row["id"],
                repository_id= row["repository_id"],
                user_id=row["user_id"],
                username= user["username"],
                email= user["email"],
                role = payload.role
            )
            return res
        except asyncpg.UniqueViolationError:
            raise ValueError("Repository with same name already exists")


async def get_collaborators(pool : asyncpg.Pool, repo_id : int) -> list[CollaboratorResponse]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_ALL_COLLABORATORS, repo_id)
        return [
            CollaboratorResponse(
                id=row["id"],
                repository_id=row["repository_id"],
                user_id=row["user_id"],
                username=row["username"],
                email=row["email"],
                role=row["role"],
            )
            for row in rows
        ]


async def remove_collaborator_from_repo(pool : asyncpg.Pool, user_id: int, repo_id : int) -> CollaboratorResponse:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            REMOVE_COLLABORATOR, repo_id, user_id
        )
        if row is None:
            raise HTTPException(status_code=404, detail="User is not a collaborator of this repository")
        return CollaboratorResponse(
            id=row["id"],
            repository_id=row["repository_id"],
            user_id=row["user_id"],
            username=row["username"],
            email=row["email"],
            role=row["role"]
        )