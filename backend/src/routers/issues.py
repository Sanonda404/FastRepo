from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import asyncpg

from services.database import get_pool

from schemas.issues import IssueCreateRequest, IssueResponse
from services.user import get_user_by_username_or_email
from services.repository_crud import get_repository, can_access_repository
from services.issues import (
    create_issue_in_repo,
    get_all_issues_in_repo,
    get_issue_by_number,
    delete_issue_by_number,
    close_issue_by_no
)
from auth.auth import get_current_user
from typing import List

router = APIRouter(
    prefix="/issues",
    tags=["issues"]
)

async def _viewable_repo(pool: asyncpg.Pool, owner_name: str, repo_name: str, user: dict):
    repo: RepositoryResponse = await get_repository(pool, owner_name, repo_name)
    if repo.is_private and not await can_access_repository(pool, repo.id, user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Private repository",
        )
    return repo

@router.post("/{owner_name}/{repo_name}",response_model=IssueResponse,status_code=status.HTTP_201_CREATED,)
async def create_issue(
    owner_name: str,
    repo_name: str,
    payload: IssueCreateRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
        new_issue = await create_issue_in_repo(pool, current_user["id"], repo.id, repo.name, current_user["username"],payload)
        return new_issue
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.get("/{owner_name}/{repo_name}",response_model=List[IssueResponse],status_code=status.HTTP_200_OK,)
async def get_all_issues(
    owner_name: str,
    repo_name: str,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
        issues = await get_all_issues_in_repo(pool, repo.id, repo.name)
        return issues
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.delete("/{owner_name}/{repo_name}/{issue_number}",response_model=IssueResponse,status_code=status.HTTP_200_OK,)
async def delete_issue(
    owner_name : str,
    repo_name: str,
    issue_number : int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _viewable_repo(pool, owner_name, repo_name, current_user)

        issue : IssueResponse = await get_issue_by_number(pool, repo.id, repo.name, issue_number)
        
        if issue.author_username != current_user["username"]:
            raise  HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="You don't have permission to delete this issue")
        
        return await delete_issue_by_number(pool, repo.id, repo.name, issue_number)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.patch("/{owner_name}/{repo_name}/{issue_number}",response_model=IssueResponse,status_code=status.HTTP_200_OK,)
async def close_issue(
    owner_name : str,
    repo_name: str,
    issue_number : int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _viewable_repo(pool, owner_name, repo_name, current_user)

        issue : IssueResponse = await get_issue_by_number(pool, repo.id, repo.name, issue_number)
        if issue is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Issue not found"
            )
        if (issue.author_username != current_user["username"]
                and not await can_access_repository(pool, repo.id, current_user["id"])):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to close this issue"
            )

        updated_issue = await close_issue_by_no(pool, current_user["id"], repo.id, issue_number,
                                current_user["username"], repo.name)
        
        return updated_issue
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )
