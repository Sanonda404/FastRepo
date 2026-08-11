import asyncpg
from fastapi import HTTPException, status
from services.database import get_pool
from schemas.repository import RepositoryResponse
from services.repository_crud import get_repository, can_access_repository
from services.issues import get_issue_repository

#requires user to be logged in, and checks if they have access to the repo
async def _viewable_repo(pool: asyncpg.Pool, owner_name: str, repo_name: str, user: dict):
    repo: RepositoryResponse = await get_repository(pool, owner_name, repo_name)
    if repo.is_private and not await can_access_repository(pool, repo.id, user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Private repository",
        )
    return repo


# even if user is not logged in, they can view public repos. If user is logged in, check if they have access to private repos.
async def _get_viewable_repo(
    pool: asyncpg.Pool, owner_name: str, repo_name: str, current_user
) -> RepositoryResponse:
    """Resolve a repository, enforcing private-repo auth."""
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


#requires user to be logged in, and checks if they have access to the repo of the issue
async def _issue_repo_viewable(pool: asyncpg.Pool, issue_id: int, user: dict):
    repo = await get_issue_repository(pool, issue_id)
    if repo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository Not Found"
        )
    if repo["is_private"] and not await can_access_repository(pool, repo["id"], user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Private repository",
        )
    return repo

async def _issue_repo_viewable_optional_login(pool: asyncpg.Pool, issue_id: int, user):
    repo = await get_issue_repository(pool, issue_id)
    if repo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository Not Found"
        )
    if repo["is_private"] and (user is None or not await can_access_repository(pool, repo["id"], user["id"])):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Private repository",
        )
    return repo