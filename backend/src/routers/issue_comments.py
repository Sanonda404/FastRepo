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
from services.issues import get_issue_repository
from services.repository_crud import can_access_repository
from auth.auth import get_current_user, get_optional_current_user
from auth.repository_auth import _issue_repo_viewable, _issue_repo_viewable_optional_login
from typing import List

router = APIRouter(
    prefix="/issues-comments",
    tags=["issues-comments"]
)

@router.post("/{issue_id}",response_model=IssueCommentResponse,status_code=status.HTTP_201_CREATED,)
async def create_issue(
    issue_id : int,
    payload: IssueCommentCreateRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        await _issue_repo_viewable(pool, issue_id, current_user)
        new_issue_cmnt = await create_issue_comment_by_issue_id(pool, issue_id, current_user["id"], current_user["username"], payload)
        return new_issue_cmnt
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.get("/{issue_id}",response_model=List[IssueCommentResponse],status_code=status.HTTP_200_OK,)
async def get_all_issue_comments(
    issue_id : int,
    current_user = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        await _issue_repo_viewable_optional_login(pool, issue_id, current_user)
        issue_cmnts = await get_all_issue_comment_by_issue_id(pool, issue_id)
        return issue_cmnts
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.delete("/{issue_cmnt_id}",response_model=IssueCommentResponse,status_code=status.HTTP_200_OK)
async def delete_issue(
    issue_cmnt_id : int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        comment = await get_issue_comment_by_id(pool, issue_cmnt_id)
        await _issue_repo_viewable(pool, comment.issue_id, current_user)
        repo_id = await get_repo_id_by_issue_comment_id(pool, issue_cmnt_id)
        if(comment.author_username != current_user["username"] and not await can_access_repository(pool, repo_id, current_user["id"])):
            raise  HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                detail="You don't have permission to delete this comment")
        return await delete_issue_comment_by_id(pool, issue_cmnt_id, current_user["username"])
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )
