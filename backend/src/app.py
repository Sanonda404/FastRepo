from fastapi import FastAPI, APIRouter
from routers.git_cli import router as git_cli_router
from routers.user import router as user_router
from routers.repository import router as repositury_router
from routers.repository_collaborator import router as repository_collaborator_router
from routers.issues import router as issues_router
from routers.pull_request import router as pull_request_router
from routers.pull_request_review import router as pull_request_review_router
from routers.issue_comments import router as issue_comments_router
from routers.teams import router as teams_router
from routers.team_members import router as team_members_router
from services.database import lifespan

api_routers = APIRouter(
    prefix="/api",
)
api_routers.include_router(user_router)
api_routers.include_router(repositury_router)
api_routers.include_router(repository_collaborator_router)
api_routers.include_router(issues_router)
api_routers.include_router(pull_request_router)
api_routers.include_router(pull_request_review_router)
api_routers.include_router(issue_comments_router)
api_routers.include_router(teams_router)
api_routers.include_router(team_members_router)

app = FastAPI(title="FastRepo", lifespan=lifespan)

app.include_router(git_cli_router)
app.include_router(api_routers)

@app.get("/")
async def root():
    return {"message" : "Hello world"}
