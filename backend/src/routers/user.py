import base64
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import ValidationError
import asyncpg

from services.database import get_pool
from schemas.user import UserCreate, UserUpdate, UserResponse, UserMeResponse, Token
from services.user import (
    create_user,
    get_user_by_username,
    get_user_by_username_or_email,
    get_user_by_id,
    update_user,
    delete_user,
    get_user_stats,
    get_profile_pic_by_user_id,
    get_profile_pic_by_username,
)
from auth.auth import (
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
MAX_PIC_BYTES = 2 * 1024 * 1024  # 2mb

def _parse_data_url(b64_str: str) -> tuple[bytes, str] | None:
    try:
        if b64_str.startswith("data:"):
            header, data = b64_str.split(",", 1)
            mime = header.split(";")[0].split(":")[1] if ":" in header else "image/png"
            content = base64.b64decode(data)
            return content, mime
        else:
            content = base64.b64decode(b64_str)
            return content, "image/png"
    except Exception:
        return None

def _validate_pic(content: bytes, mime: str):
    if mime not in ALLOWED_MIME:
        if not mime.startswith("image/"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image type. Allowed: png, jpeg, webp, gif")
    if len(content) > MAX_PIC_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile picture too large (max 2MB)")
    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty profile picture")

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: Request, pool: asyncpg.Pool = Depends(get_pool)):
    """API endpoint to register a new user"""
    try:
        ct = request.headers.get("content-type", "")
        profile_pic: tuple[bytes, str] | None = None

        if "multipart/form-data" in ct or "application/x-www-form-urlencoded" in ct:
            form = await request.form()
            username = form.get("username")
            email = form.get("email")
            password = form.get("password")
            if not username or not email or not password:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Missing required fields")
            pic = form.get("profile_pic") or form.get("profile_picture") or form.get("avatar")
            if pic and hasattr(pic, "read"):
                content = await pic.read()  # type: ignore
                mime = getattr(pic, "content_type", None) or "image/png"
                _validate_pic(content, mime)
                profile_pic = (content, mime)
            try:
                user_in = UserCreate(username=str(username), email=str(email), password=str(password))
            except ValidationError as ve:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
        else:
            try:
                body = await request.json()
            except Exception:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid JSON")
            raw_pic = body.pop("profile_pic", None) or body.pop("profile_picture", None) or body.pop("avatar", None)
            if raw_pic is not None:
                if isinstance(raw_pic, str):
                    parsed = _parse_data_url(raw_pic)
                    if parsed is None:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid profile_pic base64")
                    content, mime = parsed
                    _validate_pic(content, mime)
                    profile_pic = (content, mime)
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid profile_pic format")
            try:
                user_in = UserCreate(**body)
            except ValidationError as ve:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))

        new_user = await create_user(pool, user_in, profile_pic)
        return new_user
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    pool: asyncpg.Pool = Depends(get_pool)
):
    """Standard OAuth2 login endpoint returning a JWT token."""
    user = await get_user_by_username(pool, form_data.username)
    
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "user_id": user["id"]},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserMeResponse)
async def read_users_me(
    current_user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """Get profile details of the currently logged-in user with stats."""
    stats = await get_user_stats(pool, current_user["id"], current_user["username"])
    return {**current_user, **stats}

@router.get("/me/profile_pic")
async def get_my_profile_pic(current_user: dict = Depends(get_current_user), pool: asyncpg.Pool = Depends(get_pool)):
    row = await get_profile_pic_by_user_id(pool, current_user["id"])
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile picture not found")
    return Response(
        content=row["content"],
        media_type=row["mime_type"],
        headers={"Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache"},
    )

@router.get("/{username}/profile_pic")
async def get_profile_pic(username: str, pool: asyncpg.Pool = Depends(get_pool)):
    row = await get_profile_pic_by_username(pool, username)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile picture not found")
    return Response(
        content=row["content"],
        media_type=row["mime_type"],
        headers={"Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache"},
    )

@router.get("/{username}", response_model=UserResponse)
async def get_user_profile(username: str, pool: asyncpg.Pool = Depends(get_pool)):
    """Public profile view for a user."""
    user = await get_user_by_username_or_email(pool, username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user

@router.patch("/me", response_model=UserResponse)
async def update_me(
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """Update the currently logged-in user's profile. Username cannot be changed."""
    try:
        ct = request.headers.get("content-type", "")
        profile_pic: tuple[bytes, str] | None = None

        if "multipart/form-data" in ct or "application/x-www-form-urlencoded" in ct:
            form = await request.form()
            if "username" in form:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be changed")
            email = form.get("email")
            password = form.get("password")
            old_password = form.get("old_password")
            pic = form.get("profile_pic") or form.get("profile_picture") or form.get("avatar")
            if pic and hasattr(pic, "read"):
                content = await pic.read()  # type: ignore
                mime = getattr(pic, "content_type", None) or "image/png"
                _validate_pic(content, mime)
                profile_pic = (content, mime)
            try:
                user_in = UserUpdate(
                    email=str(email) if email else None,
                    password=str(password) if password else None,
                    old_password=str(old_password) if old_password else None,
                )
            except ValidationError as ve:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
        else:
            try:
                body = await request.json()
            except Exception:
                body = {}
            if "username" in body:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be changed")
            raw_pic = body.pop("profile_pic", None) or body.pop("profile_picture", None) or body.pop("avatar", None)
            if raw_pic is not None:
                if isinstance(raw_pic, str):
                    parsed = _parse_data_url(raw_pic)
                    if parsed is None:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid profile_pic base64")
                    content, mime = parsed
                    _validate_pic(content, mime)
                    profile_pic = (content, mime)
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid profile_pic format")
            try:
                user_in = UserUpdate(**body)
            except ValidationError as ve:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))

        return await update_user(pool, current_user["id"], user_in, profile_pic)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current_user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """Delete the currently logged-in user's account."""
    try:
        await delete_user(pool, current_user["id"])
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
