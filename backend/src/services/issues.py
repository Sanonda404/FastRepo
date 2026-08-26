from schemas.issues import IssueCreateRequest, IssueResponse, LabelResponse, IssueSummary, IssueLabel
from sqls.issue_sqls import CREATE_ISSUE, GET_ALL_ISSUES, GET_ISSUE_BY_NUMBER, DELETE_ISSUE_BY_REPO_ID_AND_NUMBER, CLOSE_ISSUE_BY_REPO_ID_AND_NUMBER, GET_ISSUE_REPOSITORY, ADD_ASSIGNEE, IS_ISSUE_ASSIGNEE, REMOVE_ASSIGNEE, LIST_ASSIGNEES, CREATE_LABEL, ATTACH_LABEL, DETACH_LABEL, LIST_ISSUE_LABELS
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


async def get_all_issues_in_repo(pool: asyncpg.Pool, repo_id: int, repo_name: str) -> List[IssueSummary]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_ALL_ISSUES, repo_id)
        if not rows:
            raise HTTPException(status_code=404, detail="No issues found for this repository")

        response: List[IssueSummary] = []

        for row in rows:
            labels : List[IssueLabel] = []
            assignees : List[str] = []
            
            for label in row["labels"]:
                labels.append(IssueLabel(
                    id = label["id"],
                    name = label["name"],
                    color = label["color"]
                ))
            
            for user in row["assignees"]:
                assignees.append(user)
            
            response.append(IssueSummary(
                id=row["id"],
                author_username=row["author_username"],
                closed_by_username=row["closed_by_username"],
                title=row["title"],
                body=row["body"],
                number=row["number"],
                state=row["state"],
                created_at=row["created_at"],
                closed_at=row["closed_at"],
                labels=labels,
                assignees=assignees,
                comments_count=row["comments_count"],
                pull_requests_count=row["pull_requests_count"]
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

async def delete_issue_by_number(pool: asyncpg.Pool, repo_id: int, repo_name: str, issue_no : int) -> IssueResponse:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(DELETE_ISSUE_BY_REPO_ID_AND_NUMBER, repo_id, issue_no)
        if row is None:
            raise HTTPException(status_code=404, detail="Issue not found")

        return IssueResponse(
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

async def get_issue_repository(pool: asyncpg.Pool, issue_id: int):
    async with pool.acquire() as conn:
        return await conn.fetchrow(GET_ISSUE_REPOSITORY, issue_id)

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

async def add_issue_assignee(pool: asyncpg.Pool, repo_id: int, issue_number: int, username: str) -> str:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(ADD_ASSIGNEE, repo_id, issue_number, username)
        if row is None:
            raise HTTPException(status_code=404, detail="Issue or assignee not found")
        return username


async def remove_issue_assignee(pool: asyncpg.Pool, repo_id: int, issue_number: int, username: str) -> str:
    async with pool.acquire() as conn:
        removed = await conn.fetchval(REMOVE_ASSIGNEE, repo_id, issue_number, username)
        if removed is None:
            raise HTTPException(status_code=404, detail="Assignee not found")
        return username


async def list_issue_assignees(pool: asyncpg.Pool, repo_id: int, issue_number: int) -> List[str]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(LIST_ASSIGNEES, repo_id, issue_number)
        return [row["username"] for row in rows]


async def attach_label(pool: asyncpg.Pool, repo_id: int, issue_number: int, payload) -> LabelResponse:
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(CREATE_LABEL, payload.name, payload.color)
            if row is None:
                # name already taken: same color -> reuse it, else reject
                row = await conn.fetchrow("SELECT id, name, color FROM labels WHERE name = $1", payload.name)
                if row["color"] != payload.color:
                    raise HTTPException(
                        status_code=400,
                        detail="Label with this name already exists with a different color",
                    )
            attached = await conn.fetchval(ATTACH_LABEL, repo_id, issue_number, row["id"])
            if attached is None:
                raise HTTPException(status_code=404, detail="Issue not found")
        return LabelResponse(**row)


async def detach_label(pool: asyncpg.Pool, repo_id: int, issue_number: int, label_id: int) -> LabelResponse:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(DETACH_LABEL, repo_id, issue_number, label_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Label not attached to this issue")
        return LabelResponse(**row)

async def list_issue_labels(pool: asyncpg.Pool, repo_id: int, issue_number: int) -> List[LabelResponse]:
    async with pool.acquire() as conn:
        return [LabelResponse(**row) for row in await conn.fetch(LIST_ISSUE_LABELS, repo_id, issue_number)]

async def is_issue_assignee(pool: asyncpg.Pool, repo_id: int, issue_number: int, username: str) -> bool:
    async with pool.acquire() as conn:
        return bool(await conn.fetchval(IS_ISSUE_ASSIGNEE, repo_id, issue_number, username))
