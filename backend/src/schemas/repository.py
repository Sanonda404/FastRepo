from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class RepositoryCreateRequest(BaseModel):
    name : str
    description : Optional[str] = None
    is_private : bool

class RepositoryUpdateRequest(BaseModel):
    name : Optional[str] = None
    description : Optional[str] = None
    is_private : Optional[bool] = None

class RepositoryResponse(BaseModel):
    id : int
    name : str
    description : Optional[str] = None
    is_private : bool
    owner_id : int
    default_branch : str
    parent_repository_id : Optional[int] = None
    created_at : datetime

    class Config:
        from_attributes = True

class ForkRepositoryRequest(BaseModel):
    name: Optional[str] = Field(
        None,
        description="Optional custom name for the target fork. Defaults to original repository name."
    )
    description: Optional[str] = Field(
        None,
        description="Optional description for the forked repository."
    )
    is_private: bool = Field(
        False,
        description="Whether the forked repository should be private."
    )
