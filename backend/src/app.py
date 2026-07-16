from fastapi import FastAPI
from routers.git_cli import router as git_cli_router
from services.database import lifespan

app = FastAPI(title="FastRepo", lifespan=lifespan)

app.include_router(git_cli_router)

@app.get("/")
async def root():
    return {"message" : "Hello world"}
