import asyncpg
from fastapi import HTTPException, status
from typing import List

from schemas.issue_comments import IssueCommentCreateRequest, IssueCommentResponse
from sqls.issue_comments_sqls import (
    CREATE_ISSUE_COMMENT,
    GET_ALL_COMMENTS_BY_ISSUE_ID,
    GET_REPO_ID_BY_ISSUE_COMMENT_ID,
    DELETE_ISSUE_COMMENT_BY_ID,
    GET_ISSUE_COMMENT_BY_ID
)

async def create_issue_comment_by_issue_id(pool : asyncpg.Pool, issue_id, author_id: int, author_name : str, payload: IssueCommentCreateRequest) -> IssueCommentResponse:
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                CREATE_ISSUE_COMMENT, issue_id, author_id, payload.body
            )
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error"
                )
            
            res = IssueCommentResponse(
                id=row["id"],
                issue_id=row["issue_id"],
                author_username= author_name,
                body=row["body"],
                created_at= row["created_at"]
            )
            return res
        except asyncpg.ForeignKeyViolationError:
            raise HTTPException(
                status_code= status.HTTP_404_NOT_FOUND, detail="Issue Not Found"
            )

async def get_all_issue_comment_by_issue_id(pool : asyncpg.Pool, issue_id: int) -> List[IssueCommentResponse]:
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(
                GET_ALL_COMMENTS_BY_ISSUE_ID, issue_id
            )
            
            responses : List[IssueCommentResponse] = []
            
            for row in rows:
                responses.append(IssueCommentResponse(
                    id=row["id"],
                    issue_id=row["issue_id"],
                    author_username= row["author_username"],
                    body=row["body"],
                    created_at= row["created_at"]
                ))
            
            return responses
        except asyncpg.ForeignKeyViolationError:
            raise HTTPException(
                status_code= status.HTTP_404_NOT_FOUND, detail="Issue Not Found"
            )

async def get_issue_comment_by_id(pool : asyncpg.Pool, issue_cmnt_id: int) -> IssueCommentResponse:
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                GET_ISSUE_COMMENT_BY_ID, issue_cmnt_id
            )
            if row is None:
                raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND, detail="Issue comment not found"
                )

            response = IssueCommentResponse(
                id=row["id"],
                issue_id=row["issue_id"],
                author_username= row["author_username"],
                body=row["body"],
                created_at= row["created_at"]
            )
            
            return response
        except asyncpg.ForeignKeyViolationError:
            raise HTTPException(
                status_code= status.HTTP_404_NOT_FOUND, detail="Issue Not Found"
            )

async def get_repo_id_by_issue_comment_id(pool : asyncpg.Pool, issue_cmnt_id: int) -> int:
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                GET_REPO_ID_BY_ISSUE_COMMENT_ID, issue_cmnt_id
            )
            if row is None:
                raise HTTPException(
                    status_code= status.HTTP_404_NOT_FOUND, detail="Issue comment not found"
                )
            return row["repository_id"]
        except asyncpg.ForeignKeyViolationError:
            raise HTTPException(
                status_code= status.HTTP_404_NOT_FOUND, detail="Issue Not Found"
            )

async def delete_issue_comment_by_id(pool : asyncpg.Pool, issue_cmnt_id: int, author_username: str) -> IssueCommentResponse:
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                DELETE_ISSUE_COMMENT_BY_ID, issue_cmnt_id
            )
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Issue comment not found"
                )
            return IssueCommentResponse(
                id=row["id"],
                issue_id=row["issue_id"],
                author_username=row["author_username"],
                body=row["body"],
                created_at=row["created_at"]
            )
        except asyncpg.PostgresError:
            raise HTTPException(
                status_code= status.HTTP_500_NOT_FOUND, detail="Internal server error"
            )
