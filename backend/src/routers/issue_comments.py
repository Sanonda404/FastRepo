from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from services.database import get_pool

from schemas.issue_comments import IssueCommentResponse, IssueCommentCreateRequest
from services.issue_comments import (
    create_issue_comment_by_issue_id,
    get_all_issue_comment_by_issue_id,
    delete_issue_comment_by_id
)
from auth.auth import get_current_user
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
        new_issue_cmnt = await create_issue_comment_by_issue_id(pool, issue_id, current_user["id"], current_user["username"], payload)
        return new_issue_cmnt
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.get("/{issue_id}",response_model=List[IssueCommentResponse],status_code=status.HTTP_200_OK,)
async def get_all_issues(
    issue_id : int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        issue_cmnts = await get_all_issue_comment_by_issue_id(pool, issue_id)
        return issue_cmnts
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.delete("/{issue_cmnt_id}",response_model=None,status_code=status.HTTP_200_OK)
async def delete_issue(
    issue_cmnt_id : int,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        await delete_issue_comment_by_id(pool, issue_cmnt_id, current_user["username"])
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )
