from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
import re

_BRANCH_RE = re.compile(r"^[A-Za-z0-9._-]+$")
_REPO_NAME_RE = re.compile(r"^[A-Za-z0-9._-]+$")

class RepositoryCreateRequest(BaseModel):
    name : str
    description : Optional[str] = None
    is_private : bool
    default_branch: Optional[str] = Field(default=None)

    @field_validator("name", mode="before")
    @classmethod
    def _normalize_name(cls, v):
        if isinstance(v, str):
            v = v.strip()
        return v

    @field_validator("name")
    @classmethod
    def _validate_name(cls, v):
        if not v:
            raise ValueError("Repository name is required")
        if not _REPO_NAME_RE.match(v):
            raise ValueError("Invalid repository name")
        return v

    @field_validator("default_branch", mode="before")
    @classmethod
    def _normalize_branch(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            v = v.strip()
            if v == "":
                return None
        return v

    @field_validator("default_branch")
    @classmethod
    def _validate_branch(cls, v):
        if v is None:
            return None
        if not _BRANCH_RE.match(v):
            raise ValueError("Invalid branch name")
        return v

class RepositoryUpdateRequest(BaseModel):
    name : Optional[str] = None
    description : Optional[str] = None
    is_private : Optional[bool] = None
    default_branch: Optional[str] = Field(default=None)

    @field_validator("name", mode="before")
    @classmethod
    def _normalize_name(cls, v):
        if isinstance(v, str):
            v = v.strip()
        return v

    @field_validator("name")
    @classmethod
    def _validate_name(cls, v):
        if v is None:
            return None
        if not v:
            raise ValueError("Repository name is required")
        if not _REPO_NAME_RE.match(v):
            raise ValueError("Invalid repository name")
        return v

    @field_validator("default_branch", mode="before")
    @classmethod
    def _normalize_branch(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            v = v.strip()
            if v == "":
                return None
        return v

    @field_validator("default_branch")
    @classmethod
    def _validate_branch(cls, v):
        if v is None:
            return None
        if not _BRANCH_RE.match(v):
            raise ValueError("Invalid branch name")
        return v

class RepositoryResponse(BaseModel):
    id : int
    name : str
    description : Optional[str] = None
    is_private : bool
    owner_id : int
    default_branch : Optional[str] = None
    parent_repository_id : Optional[int] = None
    parent_owner_username : Optional[str] = None
    parent_repository_name : Optional[str] = None
    created_at : datetime

class RepositoryDetails(RepositoryResponse):
    owner_username : str
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

class BranchResponse(BaseModel):
    name: str
    sha: str
    is_default: bool

class CommitSummary(BaseModel):
    sha: str
    author: str
    author_email: Optional[str] = None
    author_date: datetime
    message: str
    is_merge: bool = False

class FileChange(BaseModel):
    path: str
    old_path: Optional[str] = None
    status: str
    additions: int
    deletions: int
    binary: bool
    diff: Optional[str] = None

class CommitDetail(BaseModel):
    sha: str
    author: str
    author_email: Optional[str] = None
    author_date: datetime
    message: str
    parents: list[str]
    root_tree_sha: str
    diff: list[FileChange]

class TreeEntrySchema(BaseModel):
    name: str
    type: str
    mode: int
    sha: str
    size: Optional[int] = None

class TreeResponse(BaseModel):
    commit: str
    tree: str
    path: str
    entries: list[TreeEntrySchema]

class StarResponse(BaseModel):
    is_starred : bool
    star_count : int
    
class FileRequest(BaseModel):
    path: str
    ref: Optional[str] = None

class FileResponse(BaseModel):
    name: str
    path: str
    sha: str
    size: int
    binary: bool
    content: str
