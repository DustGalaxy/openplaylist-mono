from enum import Enum
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class Platform(Enum):
    TWITCH = "twitch"
    DA = "da"
    GOOGLE = "google"


class TTVUser(BaseModel):
    user_id: str
    twitch_id: str
    


class LinkedAccountWithTokensRead(BaseModel):
    id: UUID
    user_id: UUID
    platform: Platform
    platform_user_id: str

    access_token: str
    refresh_token: str
    expires_at: int

    model_config = ConfigDict(from_attributes=True)


class Tokens(BaseModel):
    user_id: str
    platform: str
    platform_user_id: str
    access_token: str
    refresh_token: str
    expires_at: int
