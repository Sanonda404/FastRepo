from schemas.issues import IssueCreateRequest, IssueResponse
from sqls.issue_sqls import CREATE_ISSUE, GET_ALL_ISSUES, GET_ISSUE_BY_NUMBER, DELETE_ISSUE_BY_REPO_ID_AND_NUMBER, CLOSE_ISSUE_BY_REPO_ID_AND_NUMBER
from fastapi import HTTPException
from typing import List
import asyncpg

async def create_issue_in_repo(pool: asyncpg.Pool, author_id: int, repo_id: int, repo_name: str,  author_name: str, payload: IssueCreateRequest):
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                CREATE_ISSUE, repo_id, author_id, payload.title, payload.body
            )
            if row is None:
                raise HTTPException(status_code=500, detail="Issue creation failed unexpectedly")
            res = IssueResponse(
                id=row["id"],
                repository_name = repo_name,
                author_username= author_name,
                closed_by_username = None,
                title= row["title"],
                body = row["body"],
                number = row["number"],
                state= row["state"],
                created_at= row["created_at"],
                closed_at= row["closed_at"]
            )
            return res
        except asyncpg.PostgresError as e:
            raise HTTPException(
                status_code=500, detail=f"Database error: {str(e)}"
            )


async def get_all_issues_in_repo(pool: asyncpg.Pool, repo_id: int, repo_name: str) -> List[IssueResponse]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_ALL_ISSUES, repo_id)
        if not rows:
            raise HTTPException(status_code=404, detail="No issues found for this repository")

        response: List[IssueResponse] = []

        for row in rows:
            response.append(IssueResponse(
                id=row["id"],
                repository_name=repo_name,
                author_username=row["author_username"],
                closed_by_username=row["closed_by_username"],
                title=row["title"],
                body=row["body"],
                number=row["number"],
                state=row["state"],
                created_at=row["created_at"],
                closed_at=row["closed_at"]
            ))

        return response

async def get_issue_by_number(pool: asyncpg.Pool, repo_id: int, repo_name: str, issue_no : int) -> IssueResponse:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_ISSUE_BY_NUMBER, repo_id, issue_no)
        if row is None:
            raise HTTPException(status_code=404, detail="Issue not found")

        response = IssueResponse(
            id=row["id"],
            repository_name=repo_name,
            author_username=row["author_username"],
            closed_by_username=row["closed_by_username"],
            title=row["title"],
            body=row["body"],
            number=row["number"],
            state=row["state"],
            created_at=row["created_at"],
            closed_at=row["closed_at"]
        )

        return response

async def delete_issue_by_number(pool: asyncpg.Pool, repo_id: int, issue_no : int) -> None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(DELETE_ISSUE_BY_REPO_ID_AND_NUMBER, repo_id, issue_no)
        if not row:
            raise HTTPException(status_code=404, detail="Issue not found")

        return None

from typing import List

async def close_issue_by_no(pool: asyncpg.Pool, closed_by_id : int, repo_id: int, issue_no: int, closed_by_username : str, repo_name : str) -> IssueResponse:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(CLOSE_ISSUE_BY_REPO_ID_AND_NUMBER, closed_by_id, repo_id, issue_no)
        if row is None:
            raise HTTPException(status_code=404, detail="No issues found for this repository")

        response = IssueResponse(
            id=row["id"],
            repository_name=repo_name,
            author_username=row["author_username"],
            closed_by_username= closed_by_username,
            title=row["title"],
            body=row["body"],
            number=row["number"],
            state=row["state"],
            created_at=row["created_at"],
            closed_at=row["closed_at"]
        )

        return response
