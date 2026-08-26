from pydantic import BaseModel, Field

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