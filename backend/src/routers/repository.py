from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List
import asyncpg

from schemas.repository_collaborator import RepositoryRole, RoleResponse
from services.database import get_pool
from schemas.repository import (
    RepositoryCreateRequest,
    RepositoryUpdateRequest,
    RepositoryResponse,
    ForkRepositoryRequest,
    BranchResponse,
    CommitSummary,
    CommitDetail,
    TreeResponse,
    StarResponse,
    FileRequest,
    FileResponse,
)
from services.repository_crud import (
    create_repository,
    get_repository,
    list_all_accessible_repositories,
    list_all_public_repositories,
    list_all_repositories,
    list_fork_repositories,
    update_repository,
    delete_repository,
    fork_repository,
    can_access_repository,
    manage_star
)
from services.git_read import (
    get_branches,
    get_commit,
    get_diff,
    get_file,
    get_history,
    get_tree,
    resolve_ref,
)

from auth.auth import get_current_user, get_optional_current_user
from auth.repository_auth import _get_viewable_repo, _viewable_repo
from models.git import EMPTY_TREE_SHA_HEX
from auth.permission import get_role

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
        new_repository = await create_repository(pool, payload, current_user)
        return new_repository
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.get("/{owner_name}", response_model=List[RepositoryResponse])
async def list_repositories(
    owner_name: str,
    current_user: dict | None = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """List repositories for a user.
        If the user is the owner, include private repos. Otherwise, only public and collaboration reps."""
    if(current_user is None):
        return await list_all_public_repositories(pool, owner_name)
    if(owner_name == current_user["username"]):
        return await list_all_repositories(pool, current_user["id"])
    return await list_all_accessible_repositories(pool, owner_name, current_user["id"])

@router.get("/{owner_name}/{repo_name}", response_model=RepositoryResponse)
async def view_repository(
    owner_name: str,
    repo_name: str,
    current_user: dict | None = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """View a repository. Private repos require owner or collaborator auth."""
    return await _get_viewable_repo(pool, owner_name, repo_name, current_user)

@router.get("/{owner_name}/{repo_name}/role", response_model=RepositoryRole)
async def get_role_in_repo(
    owner_name: str,
    repo_name: str,
    current_user: dict | None = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """get role depending on repo."""
    return await get_role(pool, owner_name, repo_name, current_user)

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

@router.get("/{owner_name}/{repo_name}/forks", response_model=List[RepositoryResponse])
async def list_forks(
    owner_name : str,
    repo_name : str,
    current_user: dict | None = Depends(get_optional_current_user),
    pool : asyncpg.Pool = Depends(get_pool)
):
    "List all the forks of repository"
    repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
    id = None
    if(current_user is not None): id = current_user["id"]
    return await list_fork_repositories(pool, repo.id, id)

@router.get("/{owner_name}/{repo_name}/branches", response_model=list[BranchResponse])
async def list_branches(
    owner_name: str,
    repo_name: str,
    current_user: dict | None = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """List branches of a repository, newest default marked."""
    repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
    return await get_branches(pool, repo.id)

@router.get("/{owner_name}/{repo_name}/commits", response_model=list[CommitSummary])
async def list_commits(
    owner_name: str,
    repo_name: str,
    ref: str | None = Query(None, description="Branch name, tag, or commit sha. Defaults to default branch."),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict | None = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """Commit history: author, time, message only."""
    repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
    head_sha = await resolve_ref(pool, repo.id, ref)
    if head_sha is None:
        raise HTTPException(status_code=404, detail="Ref not found")
    return await get_history(pool, repo.id, head_sha, limit, offset)

@router.get("/{owner_name}/{repo_name}/commits/{sha}", response_model=CommitDetail)
async def view_commit(
    owner_name: str,
    repo_name: str,
    sha: str,
    current_user: dict | None = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
    if len(sha) != 40 or any(c not in "0123456789abcdef" for c in sha):
        raise HTTPException(status_code=404, detail="Commit not found")

    commit = await get_commit(pool, repo.id, sha)
    if commit is None:
        raise HTTPException(status_code=404, detail="Commit not found")

    if commit["parents"]:
        parent_meta = await get_commit(pool, repo.id, commit["parents"][0])
        old_tree = parent_meta["root_tree_sha"] if parent_meta else EMPTY_TREE_SHA_HEX
    else:
        old_tree = EMPTY_TREE_SHA_HEX
    commit["diff"] = await get_diff(
        pool, repo.id, old_tree, commit["root_tree_sha"]
    )
    return commit

@router.get("/{owner_name}/{repo_name}/tree", response_model=TreeResponse)
async def view_tree(
    owner_name: str,
    repo_name: str,
    ref: str | None = Query(None, description="Branch name, tag, or commit sha. Defaults to default branch."),
    path: str = Query("", description="Directory path inside the ref."),
    current_user: dict | None = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """Source tree at a branch/commit, optionally inside a subdirectory."""
    repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
    tree = await get_tree(pool, repo.id, ref, path)
    if tree is None:
        raise HTTPException(status_code=404, detail="Tree not found")
    return tree


@router.post("/{owner_name}/{repo_name}/star", response_model=StarResponse)
async def add_or_remove_star(
    owner_name: str,
    repo_name: str,
    current_user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """Insert Star / remove star from a repository."""
    repo = await _viewable_repo(pool, owner_name, repo_name, current_user)
    return await manage_star(pool, current_user["id"], repo.id)

@router.post("/{owner_name}/{repo_name}/file", response_model=FileResponse)
async def view_file(
    owner_name: str,
    repo_name: str,
    payload: FileRequest,
    current_user: dict | None = Depends(get_optional_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """Fetch a file's content from the repository."""
    repo = await _get_viewable_repo(pool, owner_name, repo_name, current_user)
    file = await get_file(pool, repo.id, payload.ref, payload.path)
    if file is None:
        raise HTTPException(status_code=404, detail="File not found")
    return file
