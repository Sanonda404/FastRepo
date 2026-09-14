import base64
import logging
import os
import bcrypt
import asyncpg
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
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
RESET_PASSWORD_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("RESET_PASSWORD_TOKEN_EXPIRE_MINUTES", "5"))
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/users/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/users/login", auto_error=False)

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

def create_reset_password_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_PASSWORD_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({
        "exp": expire,
        "type": "reset_password"
    })
    
    encoded_jwt: str = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_reset_password_token(token: str) -> str:
    """
    Verifies the reset JWT and returns the user's email or ID.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != "reset_password":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token scope for password reset."
            )
            
        user_email = payload.get("sub")
        if user_email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload."
            )
            
        return user_email
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password reset token has expired or is invalid."
        )

def create_reset_password_link(reset_token: str) -> str:
    """
    Generates a password reset link for the given email.
    """
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    return reset_link


def send_reset_password_email(email_to: str, username: str, reset_link: str):
    """Dispatches a password reset email via Gmail SMTP using STARTTLS."""
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        raise ValueError("Gmail credentials are missing from environment variables.")

    message = MIMEMultipart("alternative")
    message["Subject"] = "Reset Your Password"
    message["From"] = f"FastRepo Team <{GMAIL_USER}>"
    message["To"] = email_to

    text_content = (
        f"Hi {username},\n\n"
        f"You requested a password reset. Click the link below to set a new password:\n"
        f"{reset_link}\n\n"
        f"This link will expire in 5 minutes. If you did not request this, please ignore this email."
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>Hi <strong>{username}</strong>,</p>
          <p>We received a request to reset your password. Click the button below to choose a new password:</p>
          <div style="margin: 25px 0;">
            <a href="{reset_link}" 
               style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
               Reset Password
            </a>
          </div>
          <p style="font-size: 0.9em; color: #666;">
            This link will expire in <strong>5 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
    """

    message.attach(MIMEText(text_content, "plain"))
    message.attach(MIMEText(html_content, "html"))

    with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
        server.starttls()
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_USER, email_to, message.as_string())
    logging.getLogger(__name__).info("Sent password reset email to %s", email_to)


async def get_user_by_id(pool: asyncpg.Pool, id: int) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_USER_BY_ID, id)
        if row is None:
            return None
        d = dict(row)
        pic_id = d.get("profile_pic_id")
        if pic_id is not None:
            d["profile_pic_url"] = f"/api/users/{d['username']}/profile_pic"
        else:
            d["profile_pic_url"] = None
        return d

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
            "email": user["email"],
            "profile_pic_url": user.get("profile_pic_url"),
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
        return {"id": user["id"], "username": user["username"], "email": user["email"], "profile_pic_url": user.get("profile_pic_url")}
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
    d = dict(row)
    pic_id = d.get("profile_pic_id")
    d["profile_pic_url"] = f"/api/users/{d['username']}/profile_pic" if pic_id else None
    return {"id": d["id"], "username": d["username"], "email": d["email"], "profile_pic_url": d["profile_pic_url"]}
