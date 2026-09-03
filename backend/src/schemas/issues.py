from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Literal
class IssueCreateRequest(BaseModel):
    title : str = Field(..., min_length=1, max_length=255)
    body : str

class IssueResponse(BaseModel):
    id : int
    repository_name : str
    author_username : str
    closed_by_username : str | None
    title : str
    body : str
    state : str
    number : int
    created_at : datetime
    closed_at : datetime | None

class IssueLabel(BaseModel):
    id : int
    name : str
    color : str
    
class IssueAssigneeRequest(BaseModel):
    username : str

class AssigneeResponse(BaseModel):
    username : str

class LabelCreateRequest(BaseModel):
    name : str = Field(..., min_length=1, max_length=50)
    color : str = Field("#6b7280", pattern=r"^#[0-9a-fA-F]{6}$")

class LabelResponse(BaseModel):
    id : int
    name : str
    color : str

class IssueSummary(BaseModel):
    id: int
    title: str
    body: str
    state: str
    author_username: str
    closed_by_username : Optional[str]
    
    number: int

    labels: List[IssueLabel]
    assignees: List[AssigneeResponse]

    comments_count: int
    pull_requests_count: int

    created_at: datetime
    closed_at : Optional[datetime]


class AssignedIssueResponse(BaseModel):
    id: int
    title: str
    number: int
    state: Literal["open", "closed"]
    author_username: str
    created_at: datetime
    closed_at: datetime | None

    repository_id: int
    repository_name: str
    repository_owner: str

    labels: List[IssueLabel]