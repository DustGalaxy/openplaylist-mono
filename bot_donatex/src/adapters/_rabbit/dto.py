from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ConnectionData(BaseModel):
    user_id: UUID
    platform_user_id: str

    access_token: str
    refresh_token: str
    expires_at: int
    bot_settings: dict | None = None

    model_config = ConfigDict(from_attributes=True)


class DonateXTokenRefreshed(BaseModel):
    user_id: UUID
    platform_user_id: str
    access_token: str
    refresh_token: str
    expires_at: int
