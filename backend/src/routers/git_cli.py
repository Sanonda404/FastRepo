from fastapi import APIRouter, HTTPException, Request, Response
from starlette.concurrency import run_in_threadpool
from src.services.repository import get_repo_path, ref_info_handler, pack_handler

router = APIRouter(
    prefix="/{username}/{repository}",
    tags=["git_cli"]
)

@router.get("/info/refs")
async def info_refs(username: str, repository: str, service: str) -> Response:
    if service not in ("git-upload-pack", "git-receive-pack"):
        raise HTTPException(status_code=403, detail="Unsupported service")

    repo_path = get_repo_path(username, repository)

    body: bytes = await run_in_threadpool(ref_info_handler, repo_path, service)

    return Response(
        content=body,
        media_type=f"application/x-{service}-advertisement",
        headers={
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        },
    )


@router.post("/git-upload-pack")
async def git_upload_pack(username: str, repository: str, req: Request) -> Response:
    repo_path = get_repo_path(username, repository)
    input_data = await req.body()

    output: bytes = await run_in_threadpool(
        pack_handler, repo_path, "git-upload-pack", input_data
    )

    return Response(
        content=output,
        media_type="application/x-git-upload-pack-result",
        headers={"Cache-Control": "no-cache"},
    )


@router.post("/git-receive-pack")
async def git_receive_pack(username: str, repository: str, req: Request) -> Response:
    repo_path = get_repo_path(username, repository)
    input_data = await req.body()

    output: bytes = await run_in_threadpool(
        pack_handler, repo_path, "git-receive-pack", input_data
    )

    return Response(
        content=output,
        media_type="application/x-git-receive-pack-result",
        headers={"Cache-Control": "no-cache"},
    )
