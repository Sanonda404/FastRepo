from pydantic import BaseModel
from typing import Literal

class PermissionAddRequest(BaseModel):
    target_type : Literal["branch", "folder"]
    target_identifier : str
    allow_write : bool

class PermissionResponse(BaseModel):
    id : int
    repository_id : int
    team_id : int
    team_name : str
    target_type : Literal["branch", "folder"]
    target_identifier : str
    allow_write : bool