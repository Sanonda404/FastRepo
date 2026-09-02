import asyncpg
from schemas.user import UserCreate, UserUpdate
from auth.auth import get_password_hash, verify_password
from sqls.user_sqls import (
    REGISTER_USER,
    GET_USER_BY_USERNAME,
    GET_USER_BY_EMAIL_OR_USERNAME,
    UPDATE_USER,
    DELETE_USER,
    GET_USER_STATS,
    INSERT_PROFILE_PIC,
    UPDATE_USER_PROFILE_PIC,
    GET_PROFILE_PIC_BY_USER_ID,
    GET_PROFILE_PIC_BY_USERNAME,
    GET_USER_PROFILE_PIC_ID,
    DELETE_PROFILE_PIC,
)

def _with_profile_url(row: dict | None) -> dict | None:
    if row is None:
        return None
    d = dict(row)
    pic_id = d.get("profile_pic_id")
    if pic_id is not None:
        d["profile_pic_url"] = f"/api/users/{d['username']}/profile_pic"
    else:
        d["profile_pic_url"] = None
    return d

async def _store_profile_pic(pool: asyncpg.Pool, user_id: int, content: bytes, mime_type: str) -> None:
    async with pool.acquire() as conn:
        async with conn.transaction():
            old = await conn.fetchrow(GET_USER_PROFILE_PIC_ID, user_id)
            old_id = old["profile_pic_id"] if old and old["profile_pic_id"] else None
            new_id = await conn.fetchval(INSERT_PROFILE_PIC, content, mime_type)
            await conn.execute(UPDATE_USER_PROFILE_PIC, user_id, new_id)
            if old_id:
                await conn.execute(DELETE_PROFILE_PIC, old_id)

async def create_user(pool: asyncpg.Pool, user_in: UserCreate, profile_pic: tuple[bytes, str] | None = None) -> dict:
    hashed_password = get_password_hash(user_in.password)
    
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                REGISTER_USER, user_in.username, user_in.email, hashed_password
            )
            if row is None:
                raise RuntimeError("Failed to insert user")
            user_id = row["id"]
            if profile_pic is not None:
                content, mime_type = profile_pic
                async with conn.transaction():
                    old = await conn.fetchrow(GET_USER_PROFILE_PIC_ID, user_id)
                    new_id = await conn.fetchval(INSERT_PROFILE_PIC, content, mime_type)
                    await conn.execute(UPDATE_USER_PROFILE_PIC, user_id, new_id)
                row = await conn.fetchrow("SELECT id, username, email, profile_pic_id FROM users WHERE id=$1", user_id)
            return _with_profile_url(dict(row))  # type: ignore
        except asyncpg.UniqueViolationError:
            raise ValueError("Username or email already registered")

async def get_user_by_username(pool: asyncpg.Pool, username: str) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_USER_BY_USERNAME, username)
        return _with_profile_url(row)

async def get_user_by_username_or_email(pool : asyncpg.Pool, identifier: str) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_USER_BY_EMAIL_OR_USERNAME, identifier)
        return _with_profile_url(row)

async def get_user_by_id(pool: asyncpg.Pool, user_id: int) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, username, email, profile_pic_id FROM users WHERE id=$1", user_id)
        return _with_profile_url(row)

async def update_user(pool: asyncpg.Pool, user_id: int, user_in: UserUpdate, profile_pic: tuple[bytes, str] | None = None) -> dict:
    hashed_password = None
    if user_in.password is not None:
        if not user_in.old_password:
            raise ValueError("Old password is required to change password")
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT password_hash FROM users WHERE id=$1", user_id)
            if row is None or not verify_password(user_in.old_password, row["password_hash"]):
                raise ValueError("Incorrect old password")
        hashed_password = get_password_hash(user_in.password)
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                UPDATE_USER, user_id, user_in.email, hashed_password
            )
            if row is None:
                raise ValueError("User not found")
            if profile_pic is not None:
                content, mime_type = profile_pic
                async with conn.transaction():
                    old = await conn.fetchrow(GET_USER_PROFILE_PIC_ID, user_id)
                    old_id = old["profile_pic_id"] if old and old["profile_pic_id"] else None
                    new_id = await conn.fetchval(INSERT_PROFILE_PIC, content, mime_type)
                    await conn.execute(UPDATE_USER_PROFILE_PIC, user_id, new_id)
                    if old_id:
                        await conn.execute(DELETE_PROFILE_PIC, old_id)
            row = await conn.fetchrow("SELECT id, username, email, profile_pic_id FROM users WHERE id=$1", user_id)
            return _with_profile_url(dict(row))  # type: ignore
        except asyncpg.UniqueViolationError:
            raise ValueError("Username or email already registered")

async def get_profile_pic_by_user_id(pool: asyncpg.Pool, user_id: int):
    async with pool.acquire() as conn:
        return await conn.fetchrow(GET_PROFILE_PIC_BY_USER_ID, user_id)

async def get_profile_pic_by_username(pool: asyncpg.Pool, username: str):
    async with pool.acquire() as conn:
        return await conn.fetchrow(GET_PROFILE_PIC_BY_USERNAME, username)

async def delete_user(pool: asyncpg.Pool, user_id: int) -> None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(DELETE_USER, user_id)
        if row is None:
            raise ValueError("User not found")

async def get_user_stats(pool: asyncpg.Pool, user_id: int, username: str) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_USER_STATS, user_id, username)
        return {
            "commits": int(row["commits"] or 0),
            "open_issues": int(row["open_issues"] or 0),
            "open_pull_requests": int(row["open_pull_requests"] or 0),
            "collaborators": int(row["collaborators"] or 0),
            "stars": int(row["stars"] or 0),
        }
