from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg
from services.database import get_pool

from auth.auth import get_current_user, get_optional_current_user
from auth.repository_auth import _viewable_repo, _get_viewable_repo
from typing import List
from auth.permission import can_manage_team
from services.permisssion import (
    add_permission_to_team, 
    get_all_permissions_in_repo, 
    update_permission_by_id, 
    delete_permission_by_team_and_target,
    delete_permission_by_id
)
from schemas.permissions import PermissionAddRequest, PermissionResponse

router = APIRouter(
    prefix="/permissions",
    tags=["permissions"]
)

@router.post("/{owner_name}/{repo_name}/{team_id}",response_model=PermissionResponse,status_code=status.HTTP_201_CREATED,)
async def add_new_permission_to_repo_and_team(
    owner_name: str,
    repo_name: str,
    team_id: int,
    payload: PermissionAddRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
        if(await can_manage_team(pool, owner_name, repo_name, current_user) is False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str("You don't have permission to manage permission")
            )
            
        new_permission = await add_permission_to_team(pool, repo.id, team_id, payload)
        return new_permission
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{owner_name}/{repo_name}",response_model=List[PermissionResponse],status_code=status.HTTP_200_OK,)
async def get_all_permissions(
    owner_name: str,
    repo_name: str,
    current_user = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
        permissions = await get_all_permissions_in_repo(pool, repo.id)
        return permissions
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.delete("/{owner_name}/{repo_name}/{permission_id}",response_model=None,status_code=status.HTTP_200_OK,)
async def delete_permission(
    owner_name : str,
    repo_name: str,
    permission_id : int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        if(await can_manage_team(pool, owner_name, repo_name, current_user) is False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str("You don't have permission to manage permissions")
            )

        return await delete_permission_by_id(pool, permission_id)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.delete("/{owner_name}/{repo_name}/{permission_id}",response_model=None,status_code=status.HTTP_200_OK,)
async def update_permission(
    owner_name : str,
    repo_name: str,
    permission_id : int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        if(await can_manage_team(pool, owner_name, repo_name, current_user) is False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str("You don't have permission to manage permissions")
            )

        return await update_permission_by_id(pool, permission_id)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )
