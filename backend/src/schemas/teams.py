from pydantic import BaseModel
from typing import Optional, List

class TeamCreateRequest(BaseModel):
    name : str
    parent_team_id : Optional[int]

class AddTeamMemberRequest(BaseModel):
    team_id : int

class TeamMember(BaseModel):
    id: int
    collaborator_id : int
    username : str


class TeamDetails(BaseModel):
    id: int
    repository_id: int
    name: str
    parent_team_id: Optional[int]
    members: List[TeamMember]