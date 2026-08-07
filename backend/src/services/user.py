import asyncpg
from schemas.user import UserCreate, UserUpdate
from auth.auth import get_password_hash
from sqls.user_sqls import (
    REGISTER_USER,
    GET_USER_BY_USERNAME,
    GET_USER_BY_EMAIL_OR_USERNAME,
    UPDATE_USER,
    DELETE_USER,
)

async def create_user(pool: asyncpg.Pool, user_in: UserCreate) -> dict:
    hashed_password = get_password_hash(user_in.password)
    
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                REGISTER_USER, user_in.username, user_in.email, hashed_password
            )
            if row is None:
                raise RuntimeError("Failed to insert user")
            return dict(row)
        except asyncpg.UniqueViolationError:
            raise ValueError("Username or email already registered")

async def get_user_by_username(pool: asyncpg.Pool, username: str) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_USER_BY_USERNAME, username)
        return dict(row) if row else None

async def get_user_by_username_or_email(pool : asyncpg.Pool, identifier: str) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_USER_BY_EMAIL_OR_USERNAME, identifier)
        return dict(row) if row else None

async def update_user(pool: asyncpg.Pool, user_id: int, user_in: UserUpdate) -> dict:
    hashed_password = get_password_hash(user_in.password) if user_in.password else None
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                UPDATE_USER, user_id, user_in.username, user_in.email, hashed_password
            )
            if row is None:
                raise ValueError("User not found")
            return dict(row)
        except asyncpg.UniqueViolationError:
            raise ValueError("Username or email already registered")

async def delete_user(pool: asyncpg.Pool, user_id: int) -> None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(DELETE_USER, user_id)
        if row is None:
            raise ValueError("User not found")