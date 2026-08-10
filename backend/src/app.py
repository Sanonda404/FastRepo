from fastapi import FastAPI
from routers.git_cli import router as git_cli_router
from routers.user import router as user_router
from routers.repository import router as repositury_router
from routers.repository_collaborator import router as repository_collaborator_router
from routers.issues import router as issues_router
from routers.pull_request import router as pull_request_router
from routers.pull_request_review import router as pull_request_review_router
from routers.issue_comments import router as issue_comments_router
from services.database import lifespan

app = FastAPI(title="FastRepo", lifespan=lifespan)

app.include_router(git_cli_router)
app.include_router(user_router)
app.include_router(repositury_router)
app.include_router(repository_collaborator_router)
app.include_router(issues_router)
app.include_router(pull_request_router)
app.include_router(pull_request_review_router)
app.include_router(issue_comments_router)

@app.get("/")
async def root():
    return {"message" : "Hello world"}
