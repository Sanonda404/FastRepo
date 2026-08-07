from pydantic import BaseModel, Field
from datetime import datetime
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