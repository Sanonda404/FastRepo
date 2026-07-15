from fastapi import FastAPI
from src.routers.git_cli import router as git_cli_router

app = FastAPI(title="FastRepo")

app.include_router(git_cli_router)

@app.get("/")
async def root():
    return {"message" : "Hello world"}
