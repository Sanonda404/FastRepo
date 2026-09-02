from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import asyncpg

from services.database import get_pool

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
    close_or_reopen_issue_by_no,
    add_issue_assignee,
    remove_issue_assignee,
    list_issue_assignees,
    attach_label,
    detach_label,
    list_issue_labels,
    is_issue_assignee,
)
from auth.auth import get_current_user, get_optional_current_user
from auth.permission import get_role
from auth.repository_auth import _viewable_repo, _get_viewable_repo
from typing import List

router = APIRouter(
    prefix="/issues",
    tags=["issues"]
)

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


@router.get("/{owner_name}/{repo_name}",response_model=List[IssueSummary],status_code=status.HTTP_200_OK,)
async def get_all_issues(
    owner_name: str,
    repo_name: str,
    current_user = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
        issues = await get_all_issues_in_repo(pool, repo.id, repo.name)
        return issues
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.get("/{owner_name}/{repo_name}/{issue_number}",response_model=IssueSummary,status_code=status.HTTP_200_OK,)
async def get_issue_by_no(
    owner_name : str,
    repo_name: str,
    issue_number : int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _viewable_repo(pool, owner_name, repo_name, current_user)

        return await get_issue_by_number(pool, repo.id, issue_number)
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

        issue = await get_issue_by_number(pool, repo.id, issue_number)
        
        if issue.author_username != current_user["username"] and not await can_access_repository(pool, repo.id, current_user["id"]):
            raise  HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
            detail="You don't have permission to delete this issue")
        
        return await delete_issue_by_number(pool, repo.id, repo.name, issue_number)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.patch("/{owner_name}/{repo_name}/{issue_number}",response_model=IssueSummary,status_code=status.HTTP_200_OK,)
async def close_or_reopen_issue(
    owner_name : str,
    repo_name: str,
    issue_number : int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _viewable_repo(pool, owner_name, repo_name, current_user)

        issue = await get_issue_by_number(pool, repo.id, issue_number)
        if issue is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Issue not found"
            )
        if (issue.author_username != current_user["username"]
                and not await can_access_repository(pool, repo.id, current_user["id"])
                and not await is_issue_assignee(pool, repo.id, issue_number, current_user["username"])):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to close or reopen this issue"
            )

        updated_issue = await close_or_reopen_issue_by_no(pool, current_user["id"], repo.id, issue_number,
                                current_user["username"], repo.name)
        
        return updated_issue
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

async def _issue_for_manage(pool, owner_name, repo_name, issue_number, current_user):
    repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
    issue = await get_issue_by_number(pool, repo.id, issue_number)
    if (issue.author_username != current_user["username"]
            and not await can_access_repository(pool, repo.id, current_user["id"])):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this issue",
        )
    return repo


@router.get("/{owner_name}/{repo_name}/{issue_number}/assignees", response_model=List[AssigneeResponse], status_code=status.HTTP_200_OK)
async def get_assignees(
    owner_name: str,
    repo_name: str,
    issue_number: int,
    current_user = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    try:
        repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
        return [AssigneeResponse(username=u) for u in await list_issue_assignees(pool, repo.id, issue_number)]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{owner_name}/{repo_name}/{issue_number}/assignees", response_model=AssigneeResponse, status_code=status.HTTP_201_CREATED)
async def assign_user(
    owner_name: str,
    repo_name: str,
    issue_number: int,
    payload: IssueAssigneeRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    try:
        repo = await _issue_for_manage(pool, owner_name, repo_name, issue_number, current_user)
        user = await get_user_by_username_or_email(pool, payload.username)

        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")
        
        role = await get_role(pool, owner_name, repo_name, current_user)
        if role is 'Viewer':
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to assign users to issues")
        
        #check if user is a collaborator
        if not await can_access_repository(pool, repo.id, user["id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not a collaborator of this repository")
        
        return AssigneeResponse(username=await add_issue_assignee(pool, repo.id, issue_number, payload.username))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{owner_name}/{repo_name}/{issue_number}/assignees/{username}", response_model=AssigneeResponse, status_code=status.HTTP_200_OK)
async def unassign_user(
    owner_name: str,
    repo_name: str,
    issue_number: int,
    username: str,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    try:
        repo = await _issue_for_manage(pool, owner_name, repo_name, issue_number, current_user)
        return AssigneeResponse(username=await remove_issue_assignee(pool, repo.id, issue_number, username))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{owner_name}/{repo_name}/{issue_number}/labels", response_model=List[LabelResponse], status_code=status.HTTP_200_OK)
async def get_labels(
    owner_name: str,
    repo_name: str,
    issue_number: int,
    current_user = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    try:
        repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
        return await list_issue_labels(pool, repo.id, issue_number)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{owner_name}/{repo_name}/{issue_number}/labels", response_model=LabelResponse, status_code=status.HTTP_201_CREATED)
async def attach_label_to_issue(
    owner_name: str,
    repo_name: str,
    issue_number: int,
    payload: LabelCreateRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    try:
        repo = await _issue_for_manage(pool, owner_name, repo_name, issue_number, current_user)
        return await attach_label(pool, repo.id, issue_number, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{owner_name}/{repo_name}/{issue_number}/labels/{label_id}", response_model=LabelResponse, status_code=status.HTTP_200_OK)
async def detach_label_from_issue(
    owner_name: str,
    repo_name: str,
    issue_number: int,
    label_id: int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    try:
        repo = await _issue_for_manage(pool, owner_name, repo_name, issue_number, current_user)
        return await detach_label(pool, repo.id, issue_number, label_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
