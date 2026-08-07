from pydantic import BaseModel, Field
from datetime import datetime

class IssueCommentCreateRequest(BaseModel):
    body : str

class IssueCommentResponse(BaseModel):
    id : int
    issue_id : int
    author_username : str | None
    body : str
    created_at : datetime