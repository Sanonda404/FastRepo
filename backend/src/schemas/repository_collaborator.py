from pydantic import BaseModel, Field
from enum import Enum
class RepositoryRole(str, Enum):
    OWNER = "Owner"
    ADMIN = "Admin"
    MAINTAINER = "Maintainer"
    MEMBER = "Member"
    VIEWER = "Viewer"

class CollaboratorRole(str, Enum):
    ADMIN = "Admin"
    MAINTAINER = "Maintainer"
    MEMBER = "Member"
    VIEWER = "Viewer"

class CollaboratorRoleUpdate(BaseModel):
    role : CollaboratorRole

class RoleResponse(BaseModel):
    role: RepositoryRole


class CollaboratorAddRequest(BaseModel):
    identifier : str
    role : RepositoryRole


class CollaboratorResponse(BaseModel):
    id: int
    repository_id: int
    user_id: int
    username: str
    email: str
    role: RepositoryRole

class CollaboratorDetails(BaseModel):
    id: int
    repository_id: int
    user_id: int
    role: str