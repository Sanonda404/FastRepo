from pydantic import BaseModel, Field
from enum import Enum
class RepositoryRole(str, Enum):
    OWNER = "Owner"
    ADMIN = "Admin"
    MAINTAINER = "Maintainer"
    MEMBER = "Member"
    VIEWER = "Viewer"

class RoleResponse(BaseModel):
    role: RepositoryRole


class CollaboratorAddRequest(BaseModel):
    identifier : str
    role : str


class CollaboratorResponse(BaseModel):
    id: int
    repository_id: int
    user_id: int
    username: str
    email: str
    role: str

class CollaboratorDetails(BaseModel):
    id: int
    repository_id: int
    user_id: int
    role: str