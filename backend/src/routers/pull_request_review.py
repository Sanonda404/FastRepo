from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from services.database import get_pool
from schemas.pull_request import ReviewCreateRequest, ReviewResponse, ReviewUpdateRequest
from services.repository_crud import get_repository, can_access_repository
from services.pull_request import (
    get_pull_request,
    create_pr_review,
    get_pr_reviews,
    get_pr_review,
    update_pr_review,
    delete_pr_review,
)
from auth.auth import get_current_user
from auth.repository_auth import _viewable_repo

router = APIRouter(
    prefix="/pulls",
    tags=["pull-request-reviews"],
)

async def _get_pr(pool: asyncpg.Pool, repo, pull_request_id: int):
    pr = await get_pull_request(pool, repo.id, pull_request_id)
    if pr is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pull request not found")
    return pr

async def _can_write(pool: asyncpg.Pool, repo_id: int, current_user: dict) -> None:
    if not await can_access_repository(pool, repo_id, current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action on this repository.",
        )


@router.post("/{owner_name}/{repo_name}/{pull_request_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def add_review(
    owner_name: str,
    repo_name: str,
    pull_request_id: int,
    payload: ReviewCreateRequest,
    current_user=Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
    pr = await _get_pr(pool, repo, pull_request_id)
    return await create_pr_review(pool, pr.id, current_user["id"], payload)


@router.get("/{owner_name}/{repo_name}/{pull_request_id}/reviews", response_model=list[ReviewResponse])
async def list_reviews(
    owner_name: str,
    repo_name: str,
    pull_request_id: int,
    current_user=Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
    pr = await _get_pr(pool, repo, pull_request_id)
    return await get_pr_reviews(pool, pr.id)


@router.get("/{owner_name}/{repo_name}/{pull_request_id}/reviews/{review_id}", response_model=ReviewResponse)
async def view_review(
    owner_name: str,
    repo_name: str,
    pull_request_id: int,
    review_id: int,
    current_user=Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
    pr = await _get_pr(pool, repo, pull_request_id)
    review = await get_pr_review(pool, pr.id, review_id)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review


@router.patch("/{owner_name}/{repo_name}/{pull_request_id}/reviews/{review_id}", response_model=ReviewResponse)
async def modify_review(
    owner_name: str,
    repo_name: str,
    pull_request_id: int,
    review_id: int,
    payload: ReviewUpdateRequest,
    current_user=Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
    pr = await _get_pr(pool, repo, pull_request_id)
    review = await get_pr_review(pool, pr.id, review_id)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review.reviewer_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only the reviewer can modify a review"
        )
    return await update_pr_review(pool, pr.id, review_id, payload)


@router.delete("/{owner_name}/{repo_name}/{pull_request_id}/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_review(
    owner_name: str,
    repo_name: str,
    pull_request_id: int,
    review_id: int,
    current_user=Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
    pr = await _get_pr(pool, repo, pull_request_id)
    review = await get_pr_review(pool, pr.id, review_id)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review.reviewer_id != current_user["id"]:
        await _can_write(pool, repo.id, current_user)
    await delete_pr_review(pool, pr.id, review_id)