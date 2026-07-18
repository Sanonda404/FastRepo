import os
import asyncio
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI

from dotenv import load_dotenv
from models.users import ensure_users_table
from models.repository import ensure_repositories_table
from models.repository_collaborators import ensure_repository_collaborators_table
from models.team import ensure_teams_table
from models.team_members import ensure_team_members_table

load_dotenv()
DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/fastrepo")

_pool: asyncpg.Pool | None = None

async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(DATABASE_URL)
    await asyncio.gather(
        ensure_users_table(_pool),
        ensure_repositories_table(_pool),
        ensure_repository_collaborators_table(_pool),
        ensure_teams_table(_pool),
        ensure_team_members_table(_pool)
    )

async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None

def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized")
 
    return _pool

@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_pool()
    yield
    await close_pool()
