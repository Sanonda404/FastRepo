from fastapi import APIRouter, Depends, HTTPException, Request, Response
from starlette.concurrency import run_in_threadpool

from auth.auth import get_optional_user_basic
from services.database import get_pool
from services.repository import (
    resolve_repo,
    ref_info_handler,
    pack_handler,
)
from services.repository_crud import can_access_repository

router = APIRouter(
    prefix="/{username}/{repository}",
    tags=["git_cli"]
)


def auth_required(user: dict | None) -> dict:
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Basic realm=\"git\""},
        )
    return user


async def ensure_repo_access(repo: dict, user: dict | None, require_access: bool) -> dict:
    user = auth_required(user) if (require_access or repo["is_private"]) else user
    if require_access or repo["is_private"]:
        pool = get_pool()
        if not await can_access_repository(pool, repo["id"], user["id"]):
            raise HTTPException(status_code=403, detail="Forbidden")
    return user


@router.get("/info/refs")
async def info_refs(
    username: str,
    repository: str,
    service: str,
    user: dict | None = Depends(get_optional_user_basic),
) -> Response:
    if service not in ("git-upload-pack", "git-receive-pack"):
        raise HTTPException(status_code=403, detail="Unsupported service")

    repo = await resolve_repo(username, repository)
    await ensure_repo_access(repo, user, require_access=(service == "git-receive-pack"))

    body: bytes = await run_in_threadpool(ref_info_handler, repo["id"], service)

    return Response(
        content=body,
        media_type=f"application/x-{service}-advertisement",
        headers={
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        },
    )


@router.post("/git-upload-pack")
async def git_upload_pack(
    username: str,
    repository: str,
    req: Request,
    user: dict | None = Depends(get_optional_user_basic),
) -> Response:
    repo = await resolve_repo(username, repository)
    await ensure_repo_access(repo, user, require_access=False)
    input_data = await req.body()

    output: bytes = await run_in_threadpool(
        pack_handler, repo["id"], "git-upload-pack", input_data
    )

    return Response(
        content=output,
        media_type="application/x-git-upload-pack-result",
        headers={"Cache-Control": "no-cache"},
    )


@router.post("/git-receive-pack")
async def git_receive_pack(
    username: str,
    repository: str,
    req: Request,
    user: dict | None = Depends(get_optional_user_basic),
) -> Response:
    repo = await resolve_repo(username, repository)
    await ensure_repo_access(repo, user, require_access=True)
    input_data = await req.body()

    output: bytes = await run_in_threadpool(
        pack_handler, repo["id"], "git-receive-pack", input_data
    )

    return Response(
        content=output,
        media_type="application/x-git-receive-pack-result",
        headers={"Cache-Control": "no-cache"},
    )
