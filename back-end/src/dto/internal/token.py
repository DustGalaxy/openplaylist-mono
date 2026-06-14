from pydantic import BaseModel, ConfigDict


class Tokens(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str

    model_config = ConfigDict(from_attributes=True)
