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
