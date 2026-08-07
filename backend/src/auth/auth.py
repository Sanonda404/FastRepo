import base64
import os
import bcrypt
import asyncpg
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from dotenv import load_dotenv
from sqls.user_sqls import GET_USER_BY_ID, GET_USER_BY_USERNAME
from services.database import get_pool

load_dotenv()

SECRET_KEY_ENV = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY_ENV:
    raise RuntimeError("JWT_SECRET_KEY environment variable is missing! Please check your .env file.")

SECRET_KEY: str = SECRET_KEY_ENV
ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/users/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    encoded_jwt: str = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user_by_id(pool: asyncpg.Pool, id: int) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_USER_BY_ID, id)
        return dict(row) if row else None

async def get_current_user(token: str = Depends(oauth2_scheme),
    pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user_id = payload.get("user_id")
        
        if username is None or user_id is None:
            raise credentials_exception
            
        user = await get_user_by_id(pool, user_id)
        if user is None or username != user["username"]:
            raise credentials_exception

        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"]
        }
        
    except JWTError:
        raise credentials_exception


async def get_optional_current_user(token: Optional[str] = Depends(oauth2_scheme_optional),
    pool: asyncpg.Pool = Depends(get_pool)) -> dict | None:
    """Try to get logged in user else return None"""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user_id = payload.get("user_id")
        if username is None or user_id is None:
            return None
        user = await get_user_by_id(pool, user_id)
        if user is None or username != user["username"]:
            return None
        return {"id": user["id"], "username": user["username"], "email": user["email"]}
    except JWTError:
        return None


async def get_optional_user_basic(request: Request) -> dict | None:
    """Resolve authentication from git client"""
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("basic "):
        return None
    try:
        decoded = base64.b64decode(header.split(" ", 1)[1]).decode("utf-8")
        username, sep, password = decoded.partition(":")
        if not sep:
            return None
    except Exception:
        return None
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_USER_BY_USERNAME, username)
    if row is None or not verify_password(password, row["password_hash"]):
        return None
    return {"id": row["id"], "username": row["username"], "email": row["email"]}
