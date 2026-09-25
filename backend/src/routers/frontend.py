from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse
from starlette.staticfiles import StaticFiles

DIST_DIR = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "dist"
INDEX_FILE = DIST_DIR / "index.html"

router = APIRouter(
    tags=["frontend"],
)

router.mount(
    "/assets",
    StaticFiles(directory=DIST_DIR / "assets"),
    name="frontend-assets",
)

async def serve_index() -> FileResponse:
    return FileResponse(INDEX_FILE, media_type="text/html")

def _static_file(path: Path):
    async def serve_file() -> FileResponse:
        return FileResponse(path)

    return serve_file


for _file in DIST_DIR.iterdir():
    if _file.is_file() and _file.name != "index.html":
        router.add_api_route(
            f"/{_file.name}",
            _static_file(_file),
            methods=["GET"],
            include_in_schema=False,
        )
        
FRONTEND_ROUTES = [
    "/",
    "/login",
    "/register",
    "/create/repository",
    "/forgot-password",
    "/reset-password",
    "/docs",
    "/{username}",
    "/{owner}/{repository}",
    "/{owner}/{repository}/issues",
    "/{owner}/{repository}/issues/create",
    "/{owner}/{repository}/issues/{issue_number}",
    "/{owner}/{repository}/commits",
    "/{owner}/{repository}/commits/{sha}",
    "/{owner}/{repository}/pulls",
    "/{owner}/{repository}/pulls/create",
    "/{owner}/{repository}/pulls/{pull_number}",
    "/{owner}/{repository}/pulls/new/issue",
    "/{owner}/{repository}/teams",
    "/{owner}/{repository}/settings",
]

for _path in FRONTEND_ROUTES:
    router.add_api_route(
        _path,
        serve_index,
        methods=["GET"],
        include_in_schema=False,
    )
