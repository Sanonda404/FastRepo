<<<<<<< HEAD
from fastapi import APIRouter, Depends, HTTPException, status
=======
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
>>>>>>> 0e08c80d784f74edd2440791bf485c35ed93975f
import asyncpg

from services.database import get_pool

<<<<<<< HEAD

=======
from schemas.issues import (
    IssueCreateRequest,
    IssueResponse,
    LabelCreateRequest,
    LabelResponse,
    AssigneeResponse,
    IssueAssigneeRequest,
    IssueSummary,
)
from schemas.repository import RepositoryResponse
from services.user import get_user_by_username_or_email
from services.repository_crud import can_access_repository
from services.issues import (
    create_issue_in_repo,
    get_all_issues_in_repo,
    get_issue_by_number,
    delete_issue_by_number,
    close_issue_by_no,
    add_issue_assignee,
    remove_issue_assignee,
    list_issue_assignees,
    attach_label,
    detach_label,
    list_issue_labels,
    is_issue_assignee,
)
>>>>>>> 0e08c80d784f74edd2440791bf485c35ed93975f
from auth.auth import get_current_user, get_optional_current_user
from auth.repository_auth import _viewable_repo, _get_viewable_repo
from typing import List
from schemas.teams import TeamCreateRequest, TeamDetails
from services.teams import get_all_teams_in_repo, create_team_in_repo, delete_team_by_id, update_team_name_by_id
from auth.permission import can_manage_team

router = APIRouter(
    prefix="/teams",
    tags=["teams"]
)

@router.post("/{owner_name}/{repo_name}",response_model=TeamDetails,status_code=status.HTTP_201_CREATED,)
async def create_team(
    owner_name: str,
    repo_name: str,
    payload: TeamCreateRequest,
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
            
        new_team = await create_team_in_repo(pool, repo.id, payload)
        return new_team
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{owner_name}/{repo_name}",response_model=List[TeamDetails],status_code=status.HTTP_200_OK,)
async def get_all_teams(
    owner_name: str,
    repo_name: str,
    current_user = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
        teams = await get_all_teams_in_repo(pool, repo.id)
        return teams
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.delete("/{owner_name}/{repo_name}/{team_id}",response_model=None,status_code=status.HTTP_200_OK,)
async def delete_team(
    owner_name : str,
    repo_name: str,
    team_id : int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        if(await can_manage_team(pool, owner_name, repo_name, current_user) is False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str("You don't have permission to create team")
            )

        return await delete_team_by_id(pool, team_id)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.patch("/{owner_name}/{repo_name}/{team_id}",response_model=TeamDetails,status_code=status.HTTP_200_OK,)
async def update_team_name(
    owner_name : str,
    repo_name: str,
    team_id : int,
    payload : TeamCreateRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        if(await can_manage_team(pool, owner_name, repo_name, current_user) is False):
            raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str("You don't have permission to create team")
        )

        updated_team = await update_team_name_by_id(pool, team_id, payload.name)
        
        return updated_team
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
<<<<<<< HEAD
        )
=======
        )
>>>>>>> 0e08c80d784f74edd2440791bf485c35ed93975f
