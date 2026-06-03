from pydantic import BaseModel, ConfigDict

from src.dto.internal.token import Tokens

class DAUser(BaseModel):
    id: str
    code: str
    name: str
    avatar: str
    email: str
    language: str
    socket_connection_token: str

    model_config = ConfigDict(from_attributes=True)


class DAToken(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    expires_at: int
    token_type: str
