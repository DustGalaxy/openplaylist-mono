from pydantic import BaseModel, ConfigDict


class DonateXTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str


class DonateXUserResponse(BaseModel):
    id: str
    username: str
    avatarUrl: str

    model_config = ConfigDict(from_attributes=True)
