from pydantic import BaseModel
from typing import Optional, List

class TeamCreateRequest(BaseModel):
    name : str
    parent_team_id : Optional[int]

<<<<<<< HEAD
class AddNewTeamMemberRequest(BaseModel):
    member_identifier : str
=======
class AddTeamMemberRequest(BaseModel):
>>>>>>> 0e08c80d784f74edd2440791bf485c35ed93975f
    team_id : int

class TeamMember(BaseModel):
    id: int
    collaborator_id : int
    username : str


<<<<<<< HEAD
class AddCollaboratorRequest(BaseModel):
    collaborator_id  : int

=======
>>>>>>> 0e08c80d784f74edd2440791bf485c35ed93975f
class TeamDetails(BaseModel):
    id: int
    repository_id: int
    name: str
    parent_team_id: Optional[int]
    members: List[TeamMember]