from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import asyncpg

from services.database import get_pool
from schemas.repository import (
    RepositoryCreateRequest,
    RepositoryUpdateRequest,
    RepositoryResponse,
    ForkRepositoryRequest
)
from services.repository_crud import (
    create_repository,
    get_repository,
    update_repository,
    delete_repository,
    fork_repository,
    can_access_repository,
)
from services.user import get_user_by_username_or_email
from auth.auth import get_current_user, get_optional_current_user

router = APIRouter(
    prefix="/repositories",
    tags=["repositories"]
)

@router.post("/create", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RepositoryCreateRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)):
    """API endpoint to create a new repository."""
    try:
        new_repository = await create_repository(pool, payload, current_user["id"])
        return new_repository
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.get("/{owner_name}/{repo_name}", response_model=RepositoryResponse)
async def view_repository(
    owner_name: str,
    repo_name: str,
    current_user: dict | None = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """View a repository. Private repos require owner or collaborator auth."""
    repo = await get_repository(pool, owner_name, repo_name)
    if repo.is_private and (
        current_user is None
        or not await can_access_repository(pool, repo.id, current_user["id"])
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Private repository",
        )
    return repo

@router.patch("/{owner_name}/{repo_name}", response_model=RepositoryResponse)
async def modify_repository(
    owner_name: str,
    repo_name: str,
    payload: RepositoryUpdateRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """Update a repository. Owner only."""
    repo = await get_repository(pool, owner_name, repo_name)
    if repo.owner_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this repository.",
        )
    try:
        return await update_repository(pool, current_user["id"], repo_name, payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.delete("/{owner_name}/{repo_name}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_repository(
    owner_name: str,
    repo_name: str,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """Delete a repository. Owner only."""
    repo = await get_repository(pool, owner_name, repo_name)
    if repo.owner_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this repository.",
        )
    await delete_repository(pool, current_user["id"], repo_name)

@router.post(
    "/{owner_name}/{repo_name}/fork",
    response_model=RepositoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def do_fork_repository(
    owner_name: str,
    repo_name: str,
    payload: ForkRepositoryRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        source_repo : RepositoryResponse = await get_repository(pool, owner_name, repo_name)
        if source_repo.is_private and not await can_access_repository(
            pool, source_repo.id, current_user["id"]
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to fork this repository.",
            )
        new_repo : RepositoryResponse = await fork_repository(pool, source_repo, payload, current_user["id"])
        return new_repo
    except ValueError as e:
        raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e)
        )
