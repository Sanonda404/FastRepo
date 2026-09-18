from pydantic import BaseModel, Field
from datetime import datetime
from typing import List

class PullRequestCreateRequest(BaseModel):
    title: str | None = None
    body: str = ""
    source_branch: str = Field(..., min_length=1, max_length=255)
    target_branch: str = Field(..., min_length=1, max_length=255)
    source_repository_id: int | None = None

class PullRequestUpdateRequest(BaseModel):
    title: str | None = None
    body: str | None = None
    state: str | None = None

class PullRequestResponse(BaseModel):
    id: int
    repository_id: int
    author_id: int | None
    title: str | None = None
    author_username: str | None
    body: str | None
    state: str
    source_branch: str
    target_branch: str
    source_repository_id: int | None
    created_at: datetime
    closed_at: datetime | None

from typing import Literal

class ReviewCreateRequest(BaseModel):
    decision: Literal["APPROVED", "REQUEST_CHANGES", "COMMENTED", "REJECTED"]
    body: str = ""

class ReviewUpdateRequest(BaseModel):
    decision: Literal["APPROVED", "REQUEST_CHANGES", "COMMENTED", "REJECTED"] | None = None
    body: str | None = None

class ReviewResponse(BaseModel):
    id: int
    pull_request_id: int
    reviewer_id: int | None
    reviewer_username: str | None
    decision: str
    body: str | None
    reviewed_at: datetime

class MergeResponse(PullRequestResponse):
    merge_commit_sha: str | None = None

class MergeableResponse(BaseModel):
    mergeable: bool
    reason: str | None = None
    conflicts: list[str] = []

class IssuePullRequestCreateRequest(BaseModel):
    title: str | None = None
    body: str = ""
    source_branch: str = Field(..., min_length=1, max_length=255)
    target_branch: str = Field(..., min_length=1, max_length=255)
    source_repository_id: int | None = None
    issue_ids : List[int]


class IssueRef(BaseModel):
    id: int
    number : int
    title: str
    state: str
    created_at: datetime
