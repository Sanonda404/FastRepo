from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from services.database import get_pool


from auth.auth import get_current_user, get_optional_current_user
from auth.repository_auth import _viewable_repo, _get_viewable_repo
from typing import List
from schemas.teams import AddNewTeamMemberRequest, TeamMember, AddCollaboratorRequest
from auth.permission import can_manage_team
from services.team_members import add_new_member_in_repo_team, add_existing_collaborator_to_team, get_all_team_members_in_team, delete_team_member_by_id

router = APIRouter(
    prefix="/team_members",
    tags=["team_members"]
)

@router.post("/{owner_name}/{repo_name}/{team_id}/new",response_model=TeamMember,status_code=status.HTTP_201_CREATED,)
async def add_new_member_to_repo_and_team(
    owner_name: str,
    repo_name: str,
    team_id: int,
    payload: AddNewTeamMemberRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
        if(await can_manage_team(pool, owner_name, repo_name, current_user) is False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str("You don't have permission to create team")
            )
            
        new_member = await add_new_member_in_repo_team(pool, repo.id, team_id, payload)
        return new_member
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{owner_name}/{repo_name}/{team_id}",response_model=TeamMember,status_code=status.HTTP_201_CREATED,)
async def add_existing_collaborator(
    owner_name: str,
    repo_name: str,
    team_id: int,
    payload: AddCollaboratorRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
        if(await can_manage_team(pool, owner_name, repo_name, current_user) is False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str("You don't have permission to create team")
            )
            
        new_member = await add_existing_collaborator_to_team(pool, repo.id, team_id, payload.collaborator_id)
        return new_member
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{owner_name}/{repo_name}/{team_id}",response_model=List[TeamMember],status_code=status.HTTP_200_OK,)
async def get_all_members(
    owner_name: str,
    repo_name: str,
    team_id : int,
    current_user = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        await _get_viewable_repo(pool, owner_name, repo_name, current_user)
        teams = await get_all_team_members_in_team(pool, team_id)
        return teams
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.delete("/{owner_name}/{repo_name}/{team_id}/{member_id}",response_model=None,status_code=status.HTTP_200_OK,)
async def delete_team_member(
    owner_name : str,
    repo_name: str,
    team_id : int,
    member_id : int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        if(await can_manage_team(pool, owner_name, repo_name, current_user) is False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str("You don't have permission to create team")
            )

        return await delete_team_member_by_id(pool, team_id, member_id)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

