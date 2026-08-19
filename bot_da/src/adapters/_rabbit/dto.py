from enum import Enum
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class Platform(str, Enum):
    TWITCH = "twitch"
    DA = "donationalerts"
    DONATEPAY = "donatepay"
    DONATEX = "donatex"
    GOOGLE = "google"


class ConnectionData(BaseModel):
    user_id: UUID
    platform_user_id: str
    access_token: str
    refresh_token: str = ""
    expires_at: int = 0
    platform: Platform | str | None = None
    bot_settings: dict | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DATokenRefreshed(BaseModel):
    user_id: UUID
    platform_user_id: str
    access_token: str
    refresh_token: str | None
    expires_at: int


class DAUser(BaseModel):
    user_id: UUID
    da_id: str
    access_token: str
    refresh_token: str = ""
    expires_at: int = 0

    model_config = ConfigDict(from_attributes=True)
