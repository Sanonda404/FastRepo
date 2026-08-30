from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from services.database import get_pool

from schemas.repository_collaborator import CollaboratorAddRequest, CollaboratorResponse, CollaboratorRoleUpdate
from services.repository_collaborator import add_collaborator_to_repo, get_collaborators, remove_collaborator_from_repo, update_collaborator_role_in_repo, get_user_details
from services.repository_crud import get_repository, can_access_repository
from services.user import get_user_by_username_or_email
from auth.auth import get_current_user, get_optional_current_user
from auth.repository_auth import _get_viewable_repo, _viewable_repo
from auth.permission import get_role
from typing import List

router = APIRouter(
    prefix="/collaborators",
    tags=["repository-collaborators"]
)


@router.get("/{owner_name}/{repo_name}", response_model=List[CollaboratorResponse], status_code=status.HTTP_200_OK)
async def list_collaborators(
    owner_name: str,
    repo_name: str,
    current_user: dict | None = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
        return await get_collaborators(pool, repo.id)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{owner_name}/{repo_name}", response_model=CollaboratorResponse, status_code=status.HTTP_201_CREATED)
async def add_collaborator(
    owner_name: str,
    repo_name: str,
    payload: CollaboratorAddRequest,
    current_user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await get_repository(pool, owner_name, repo_name)
        role = await get_role(pool, owner_name, repo_name, current_user)
        if role not in ('Admin','Owner'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to add collaborators to this repository."
            )
        user = await get_user_by_username_or_email(pool, payload.identifier)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collaborator not found"
            )
        return await add_collaborator_to_repo(pool, repo.id, payload, user)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.patch("/{owner_name}/{repo_name}/{collaborator_id}", response_model=CollaboratorResponse, status_code=status.HTTP_200_OK)
async def update_collaborator_role(
    owner_name: str,
    repo_name: str,
    collaborator_id:int,
    payload : CollaboratorRoleUpdate,
    current_user: dict | None = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await get_repository(pool, owner_name, repo_name)
        role = await get_role(pool, owner_name, repo_name, current_user)
        if role not in ('Admin','Owner'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to add collaborators to this repository."
            )
        user = await get_user_details(pool, repo.id, collaborator_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collaborator not found"
        )
        return await update_collaborator_role_in_repo(pool, repo.id, collaborator_id, payload, user)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{owner_name}/{repo_name}/{collaborator_id}", response_model=CollaboratorResponse, status_code=status.HTTP_200_OK)
async def remove_collaborator(
    owner_name: str,
    repo_name: str,
    collaborator_id: int,
    current_user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo = await get_repository(pool, owner_name, repo_name)
        role = await get_role(pool, owner_name, repo_name, current_user)
        if role not in ('Admin','Owner'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to add collaborators to this repository."
            )
        user = await get_user_details(pool, repo.id, collaborator_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collaborator not found"
            )
        return await remove_collaborator_from_repo(pool, user.id, repo.id)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
