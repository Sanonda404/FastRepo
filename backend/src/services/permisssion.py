from fastapi import HTTPException
from typing import List
from schemas.permissions import PermissionAddRequest, PermissionResponse
from sqls.permission_sqls import (
    CREATE_PERMISSION,
    GET_ALL_PERMISSIONS_OF_REPO,
    DELETE_PERMISSION_BY_ID,
    DELETE_PERMISSIONS_BY_TEAM_AND_TARGET,
    UPDATE_PERMISSION_BY_ID,
)
from auth.permission import check_same_repo_team
import asyncpg


async def add_permission_to_team(
    pool: asyncpg.Pool, repo_id: int, team_id: int, payload: PermissionAddRequest
) -> PermissionResponse:
    async with pool.acquire() as conn:
        try:
            if not await check_same_repo_team(pool, repo_id, team_id):
                raise HTTPException(
                    status_code=403, detail="Team must belong to the specified repository"
                )
            row = await conn.fetchrow(
                CREATE_PERMISSION,
                team_id,
                payload.target_type,
                payload.target_identifier,
                payload.allow_write,
            )
            if row is None:
                raise HTTPException(
                    status_code=500, detail="Permission creation failed unexpectedly"
                )
            return PermissionResponse(**dict(row))
        except asyncpg.UniqueViolationError:
            raise HTTPException(
                status_code=409, detail="Permission rule already exists for this team and target"
            )
        except asyncpg.PostgresError as e:
            raise HTTPException(
                status_code=500, detail=f"Database error: {str(e)}"
            )


async def get_all_permissions_in_repo(
    pool: asyncpg.Pool, repo_id: int
) -> List[PermissionResponse]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_ALL_PERMISSIONS_OF_REPO, repo_id)
        return [PermissionResponse(**dict(row)) for row in rows]


async def delete_permission_by_id(pool: asyncpg.Pool, permission_id: int) -> None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(DELETE_PERMISSION_BY_ID, permission_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Permission not found")


async def delete_permission_by_team_and_target(
    pool: asyncpg.Pool, repo_id: int, team_id: int, payload: PermissionAddRequest
) -> None:
    async with pool.acquire() as conn:
        if not await check_same_repo_team(pool, repo_id, team_id):
            raise HTTPException(
                status_code=403, detail="Team must belong to the specified repository"
            )
        row = await conn.fetchrow(
            DELETE_PERMISSIONS_BY_TEAM_AND_TARGET,
            team_id,
            payload.target_type,
            payload.target_identifier,
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Permission not found")


async def update_permission_by_id(
    pool: asyncpg.Pool,
    permission_id: int,
    payload: PermissionAddRequest,
) -> PermissionResponse:
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                UPDATE_PERMISSION_BY_ID,
                permission_id,
                payload.target_type,
                payload.target_identifier,
                payload.allow_write,
            )
            if row is None:
                raise HTTPException(status_code=404, detail="Permission not found")
            return PermissionResponse(**dict(row))
        except asyncpg.UniqueViolationError:
            raise HTTPException(
                status_code=409, detail="Updated target violates an existing team permission rule"
            )
        except asyncpg.PostgresError as e:
            raise HTTPException(
                status_code=500, detail=f"Database error: {str(e)}"
            )