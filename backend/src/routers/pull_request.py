from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from services.database import get_pool
from schemas.pull_request import (
    PullRequestCreateRequest,
    PullRequestResponse,
    PullRequestUpdateRequest,
    MergeResponse,
)
from services.repository_crud import get_repository, can_access_repository
from services.pull_request import (
    create_pull_request,
    get_all_pull_requests,
    get_pull_request,
    update_pull_request,
    delete_pull_request,
)
from services.git_merge import merge_pull_request, MergeConflictError
from auth.auth import get_current_user

router = APIRouter(
    prefix="/pulls",
    tags=["pull-requests"],
)

async def _viewable_repo(pool: asyncpg.Pool, owner_name: str, repo_name: str, user: dict):
    repo = await get_repository(pool, owner_name, repo_name)
    if repo.is_private and not await can_access_repository(pool, repo.id, user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Private repository",
        )
    return repo

async def _can_write(pool: asyncpg.Pool, repo_id: int, current_user: dict) -> None:
    if not await can_access_repository(pool, repo_id, current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action on this repository.",
        )

@router.post("/{owner_name}/{repo_name}/", response_model=PullRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_pull(
    owner_name: str,
    repo_name: str,
    payload: PullRequestCreateRequest,
    current_user=Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    try:
        repo = await get_repository(pool, owner_name, repo_name)
        if repo.is_private and not await can_access_repository(pool, repo.id, current_user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Private repository"
            )
        return await create_pull_request(
            pool, current_user["id"], current_user["username"], {"id": repo.id}, payload
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{owner_name}/{repo_name}/", response_model=list[PullRequestResponse])
async def list_pulls(
    owner_name: str,
    repo_name: str,
    current_user=Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
    return await get_all_pull_requests(pool, repo.id)


@router.get("/{owner_name}/{repo_name}/{pull_request_id}", response_model=PullRequestResponse)
async def get_pull(
    owner_name: str,
    repo_name: str,
    pull_request_id: int,
    current_user=Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
    pr = await get_pull_request(pool, repo.id, pull_request_id)
    if pr is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pull request not found")
    return pr


@router.patch("/{owner_name}/{repo_name}/{pull_request_id}", response_model=PullRequestResponse)
async def modify_pull(
    owner_name: str,
    repo_name: str,
    pull_request_id: int,
    payload: PullRequestUpdateRequest,
    current_user=Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
    pr = await get_pull_request(pool, repo.id, pull_request_id)
    if pr is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pull request not found")
    if pr.author_id != current_user["id"]:
        await _can_write(pool, repo.id, current_user)
    if payload.state is not None and payload.state not in ("open", "closed"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state")
    return await update_pull_request(pool, repo.id, pull_request_id, payload)


@router.delete("/{owner_name}/{repo_name}/{pull_request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_pull(
    owner_name: str,
    repo_name: str,
    pull_request_id: int,
    current_user=Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
    pr = await get_pull_request(pool, repo.id, pull_request_id)
    if pr is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pull request not found")
    if pr.author_id != current_user["id"]:
        await _can_write(pool, repo.id, current_user)
    await delete_pull_request(pool, repo.id, pull_request_id)


@router.post("/{owner_name}/{repo_name}/{pull_request_id}/merge", response_model=MergeResponse)
async def merge_pull(
    owner_name: str,
    repo_name: str,
    pull_request_id: int,
    current_user=Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    repo = await get_repository(pool, owner_name, repo_name)
    if not await can_access_repository(pool, repo.id, current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner or a collaborator can merge a pull request",
        )
    pr = await get_pull_request(pool, repo.id, pull_request_id)
    if pr is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pull request not found")
    if pr.state != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pull request is not open")
    try:
        merge_sha = await merge_pull_request(
            pool,
            pr.id,
            pr.author_id,
            current_user,
            {"id": repo.id, "owner_id": repo.owner_id},
            pr.source_branch,
            pr.target_branch,
            pr.source_repository_id,
        )
    except MergeConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    merged_pr = await get_pull_request(pool, repo.id, pull_request_id)
    return MergeResponse(**merged_pr.model_dump(), merge_commit_sha=merge_sha.decode())
