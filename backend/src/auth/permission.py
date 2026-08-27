# rule:
# if role is admin, allow all just repository delete is owner
# if role is maintainer, allow default write access but can't change any settings
# if role is member, then can only exist with teams
# if role is viewer, then only in provate repo and only have read access, no write access

import asyncpg
from fastapi import HTTPException, status
from services.repository_crud import get_repository, can_access_repository
from services.repository_collaborator import get_collaborator_details
from sqls.permission_sqls import CHECK_BRANCH_PERMISSION, CHECK_FOLDER_PERMISSION

async def can_push_to_branch(
    pool: asyncpg.Pool, 
    owner_name: str, 
    repo_name: str, 
    branch_name: str, 
    current_user: dict
) -> bool:
    repo = await get_repository(pool, owner_name, repo_name)
    if repo.owner_id == current_user["id"]: 
        return True
        
    collaborator = await get_collaborator_details(pool, repo.id, current_user["id"])
    if not collaborator or collaborator.role == 'Viewer':
        return False
    if collaborator.role in ('Maintainer', 'Admin'):
        return True

    async with pool.acquire() as conn:
        try:
            # $1 = repo.id, $2 = user_id, $3 = branch_name
            row = await conn.fetchrow(
                CHECK_BRANCH_PERMISSION, repo.id, current_user["id"], branch_name
            )
            
            # If no rule found, default-deny for 'Member' role
            if row is None:
                return False

            return row["allow_write"]
            
        except asyncpg.PostgresError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Internal database error while verifying permissions."
            )


async def can_push_to_folder(
    pool: asyncpg.Pool, 
    owner_name: str, 
    repo_name: str, 
    file_path: str, 
    current_user: dict
) -> bool:
    """
    Evaluates whether a user can modify a file at a specific folder path.
    - Owner / Admin / Maintainer: Bypasses restrictions.
    - Viewer / Non-collaborator: Blocked immediately.
    - Member: Evaluates hierarchical folder permissions with team inheritance.
    """
    repo = await get_repository(pool, owner_name, repo_name)
    if repo.owner_id == current_user["id"]:
        return True

    collaborator = await get_collaborator_details(pool, repo.id, current_user["id"])
    if not collaborator or collaborator.role == 'Viewer':
        return False
    if collaborator.role in ('Maintainer', 'Admin'):
        return True

    async with pool.acquire() as conn:
        try:
            # $1 = repo.id, $2 = current_user["id"], $3 = file_path
            row = await conn.fetchrow(
                CHECK_FOLDER_PERMISSION, repo.id, current_user["id"], file_path
            )

            # If no explicit folder rule found, fallback to default-deny for 'Member'
            if row is None:
                return False

            # Return explicit boolean decision (True/False)
            return row["allow_write"]

        except asyncpg.PostgresError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal database error while verifying folder permissions."
            )

async def can_manage_team(
    pool: asyncpg.Pool, 
    owner_name: str, 
    repo_name: str, 
    current_user: dict
) -> bool:
    repo = await get_repository(pool, owner_name, repo_name)
    if repo.owner_id == current_user["id"]: 
        return True

    collaborator = await get_collaborator_details(pool, repo.id, current_user["id"])

    if collaborator.role == 'Admin':
        return True

    return False
