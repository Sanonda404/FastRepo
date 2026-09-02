from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from services.database import get_pool

from schemas.issue_comments import IssueCommentResponse, IssueCommentCreateRequest
from services.issue_comments import (
    create_issue_comment_by_issue_id,
    get_all_issue_comment_by_issue_id,
    get_issue_comment_by_id,
    delete_issue_comment_by_id,
    get_repo_id_by_issue_comment_id
)
from services.issues import get_issue_by_number
from services.repository_crud import can_access_repository
from auth.auth import get_current_user, get_optional_current_user
from auth.repository_auth import _viewable_repo, _get_viewable_repo
from typing import List

router = APIRouter(
    prefix="/comments",
    tags=["comments"]
)

@router.post("/{owner}/{repo_name}/{issue_number}",response_model=IssueCommentResponse,status_code=status.HTTP_201_CREATED,)
async def create_issue(
    owner: str,
    repo_name: str,
    issue_number: int,
    payload: IssueCommentCreateRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _viewable_repo(pool, owner, repo_name, current_user)
        issue = await get_issue_by_number(pool, repo.id, issue_number)
        if issue.state == "closed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot comment on a closed issue")
        new_issue_cmnt = await create_issue_comment_by_issue_id(pool, issue.id, current_user["id"], current_user["username"], payload)
        return new_issue_cmnt
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.get("/{owner}/{repo_name}/{issue_number}",response_model=List[IssueCommentResponse],status_code=status.HTTP_200_OK,)
async def get_all_issue_comments(
    owner: str,
    repo_name: str,
    issue_number: int,
    current_user = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        await _get_viewable_repo(pool, owner, repo_name, current_user)
        repo = await _get_viewable_repo(pool, owner, repo_name, current_user)
        issue = await get_issue_by_number(pool, repo.id, issue_number)
        issue_cmnts = await get_all_issue_comment_by_issue_id(pool, issue.id)
        return issue_cmnts
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.delete("/{owner}/{repo_name}/{issue_cmnt_id}",response_model=IssueCommentResponse,status_code=status.HTTP_200_OK)
async def delete_issue(
    owner: str,
    repo_name: str,
    issue_cmnt_id: int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        comment = await get_issue_comment_by_id(pool, issue_cmnt_id)
        await _viewable_repo(pool, owner, repo_name, current_user)
        repo_id = await get_repo_id_by_issue_comment_id(pool, issue_cmnt_id)
        if(comment.author_username != current_user["username"] and not await can_access_repository(pool, repo_id, current_user["id"])):
            raise  HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                detail="You don't have permission to delete this comment")
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT state FROM issues WHERE id = $1", comment.issue_id)
            if row and row["state"] == "closed":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify a closed issue")
        return await delete_issue_comment_by_id(pool, issue_cmnt_id, current_user["username"])
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )
