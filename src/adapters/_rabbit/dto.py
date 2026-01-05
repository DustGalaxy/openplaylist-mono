from uuid import UUID
from pydantic import BaseModel, ConfigDict


class DATokenRefreshed(BaseModel):
    user_id: UUID
    access_token: str
    refresh_token: str
    expires_at: int


class TwitchTokenRefreshed(BaseModel):
    twitch_id: int
    access_token: str
    refresh_token: str
    expires_in: int


class DAUser(BaseModel):
    user_id: UUID
    da_id: str
    access_token: str
    refresh_token: str
    expires_at: int
    model_config = ConfigDict(from_attributes=True)


class TwitchUser(BaseModel):
    user_id: UUID
    twitch_id: str
    access_token: str
    refresh_token: str
    expires_at: int
    model_config = ConfigDict(from_attributes=True)
