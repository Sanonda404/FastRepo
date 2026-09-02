from fastapi import APIRouter, Depends, HTTPException, Request, Response
from starlette.concurrency import run_in_threadpool

from auth.auth import get_optional_user_basic
from services.database import get_pool
from services.repository import (
    resolve_repo,
    ref_info_handler,
    pack_handler,
)
from services.git_backend import RefContainer
from services.push_policy import PushPolicy, ZERO_SHA

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


async def get_push_role(pool, repo: dict, user: dict) -> str | None:
    if user["id"] == repo["owner_id"]:
        return "owner"
    async with pool.acquire() as conn:
        role = await conn.fetchval(
            "SELECT role FROM repository_collaborators WHERE repository_id = $1 AND user_id = $2",
            repo["id"], user["id"],
        )
    return role


async def ensure_push_allowed(repo: dict, user: dict | None) -> tuple[dict, str]:
    user = auth_required(user)
    role = await get_push_role(get_pool(), repo, user)
    if role is None or role == "Viewer":
        raise HTTPException(status_code=403, detail="Forbidden")
    return user, role


async def ensure_read_access(repo: dict, user: dict | None) -> dict:
    if not repo["is_private"]:
        return user
    user = auth_required(user)
    if not await get_push_role(get_pool(), repo, user):
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


def _rollback_refs(repo_id: int, commands) -> None:
    refs = RefContainer(repo_id)
    for old_sha, new_sha, name in commands:
        if old_sha == ZERO_SHA:
            refs.remove_if_equals(name, new_sha)
        else:
            refs.set_if_equals(name, new_sha, old_sha)


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
    if service == "git-receive-pack":
        await ensure_push_allowed(repo, user)
    else:
        await ensure_read_access(repo, user)

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
    await ensure_read_access(repo, user)
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
    user, role = await ensure_push_allowed(repo, user)
    input_data = await req.body()

    policy = PushPolicy(repo["id"], role, user)

    def _handle() -> bytes:
        try:
            output = pack_handler(repo["id"], "git-receive-pack", input_data, policy=policy)
        except Exception as e:
            import traceback
            traceback.print_exc()
            if policy.violations:
                _rollback_refs(repo["id"], policy.commands)
            raise
        if policy.violations:
            _rollback_refs(repo["id"], policy.commands)
        return output

    try:
        output: bytes = await run_in_threadpool(_handle)
    except Exception as e:
        from dulwich.errors import HookError
        if isinstance(e, HookError):
            if policy.violations:
                _rollback_refs(repo["id"], policy.commands)
            raise HTTPException(status_code=403, detail=str(e))
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")

    return Response(
        content=output,
        media_type="application/x-git-receive-pack-result",
        headers={"Cache-Control": "no-cache"},
    )
