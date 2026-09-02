from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)

    model_config = ConfigDict(extra="forbid")

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    profile_pic_url: Optional[str] = None

    class Config:
        from_attributes = True

class UserMeResponse(UserResponse):
    commits: int
    open_issues: int
    open_pull_requests: int
    collaborators: int
    stars: int

class Token(BaseModel):
    access_token: str
    token_type: str
