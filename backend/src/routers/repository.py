from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import asyncpg

from services.database import get_pool
from schemas.repository import (
    RepositoryCreateRequest,
    RepositoryResponse,
    ForkRepositoryRequest
)
from services.repository_crud import create_repository, get_repository, fork_repository
from services.user import get_user_by_username_or_email
from auth.auth import get_current_user

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
    """
    Executes a repository fork transaction:
    1. Resolves parent repository metadata.
    2. Creates new repository record owned by current_user.
    3. Copies active branch pointers and commit links to the new repo ID.
    """
    try:
        source_repo : RepositoryResponse = await get_repository(pool, owner_name, repo_name)
        new_repo : RepositoryResponse = await fork_repository(pool, source_repo, payload, current_user["id"])
        return new_repo
    except ValueError as e:
        raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e)
        )