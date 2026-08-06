from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import asyncpg

from services.database import get_pool

from schemas.repository_collaborator import CollaboratorAddRequest, CollaboratorResponse
from services.repository_collaborator import add_collaborator_to_repo, remove_collaborator_from_repo
from schemas.repository import RepositoryResponse
from services.repository_crud import get_repository
from services.user import get_user_by_username_or_email
from auth.auth import get_current_user

router = APIRouter(
    prefix="/repository-collaborators",
    tags=["repository-collaborators"]
)

@router.post("/{owner_name}/{repo_name}/add-collaborator",response_model=CollaboratorResponse,status_code=status.HTTP_201_CREATED,)
async def add_collaborator(
    owner_name: str,
    repo_name: str,
    payload: CollaboratorAddRequest,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo : RepositoryResponse = await get_repository(pool, owner_name, repo_name)
        user = await get_user_by_username_or_email(pool, payload.idenifier)
        if(repo is None):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Repository not found"
            )
        if(repo.owner_id != current_user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to add collaborators to this repository."
            )
        if(user is None):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collaborator not found"
            )
        new_collaborator = await add_collaborator_to_repo(pool, user["id"], repo.id, payload, user)
        return new_collaborator
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.delete("/{repo_name}/{collaborator_username}",response_model=CollaboratorResponse,status_code=status.HTTP_201_CREATED,)
async def remove_collaborator(
    repo_name: str,
    collaborator_username: str,
    current_user = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    try:
        repo : RepositoryResponse = await get_repository(pool, current_user["username"], repo_name)
        user = await get_user_by_username_or_email(pool, collaborator_username)
        if(repo is None):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Repository not found"
            )
        if(repo.owner_id != current_user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to remove collaborators from this repository."
            )
        if(user is None):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collaborator not found"
            )
        await remove_collaborator_from_repo(pool, user["id"], repo.id)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )
