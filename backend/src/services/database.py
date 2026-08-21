import os
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI

from dotenv import load_dotenv
from models.users import ensure_users_table
from models.repository import ensure_repositories_table
from models.repository_collaborators import ensure_repository_collaborators_table
from models.team import ensure_teams_table
from models.team_members import ensure_team_members_table
from models.git import ensure_tables as ensure_git_tables
from models.issues import ensure_issues_table
from models.issue_comments import ensure_issues_comments_table
from models.pull_request import ensure_pull_requests_table
from models.pr_reviews import ensure_pr_reviews_table
from models.stars import ensure_stars_table
from models.labels import ensure_labels_table
from models.issue_assignees import ensure_issue_assignees_table
from models.issue_pull_requests import ensure_issue_pull_requests_table
from models.

load_dotenv()
DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/fastrepo")

_pool: asyncpg.Pool | None = None

async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(DATABASE_URL)
    await ensure_users_table(_pool)
    await ensure_repositories_table(_pool)
    await ensure_repository_collaborators_table(_pool)
    await ensure_teams_table(_pool)
    await ensure_team_members_table(_pool)
    await ensure_git_tables(_pool)
    await ensure_issues_table(_pool)
    await ensure_issues_comments_table(_pool)
    await ensure_pull_requests_table(_pool)
    await ensure_pr_reviews_table(_pool)
    await ensure_stars_table(_pool)
    await ensure_labels_table(_pool)
    await ensure_issue_assignees_table(_pool)
    await ensure_issue_pull_requests_table(_pool)

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
