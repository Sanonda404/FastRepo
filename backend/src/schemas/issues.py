from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
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
    
class IssueSummary(BaseModel):
    id: int
    title: str
    body: str
    state: str
    author_username: str
    closed_by_username : Optional[str]
    
    number: int

    labels: List[IssueLabel]
    assignees: List[str]

    comments_count: int
    pull_requests_count: int

    created_at: datetime
    closed_at : Optional[datetime]
