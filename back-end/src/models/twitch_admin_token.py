from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TwitchAdminTokenDomain(BaseModel):
    id: UUID
    twitch_user_id: str | None = None
    twitch_username: str | None = None
    twitch_email: str | None = None

    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"

    expires_in: int | None = None
    expires_at: datetime | None = None

    scope: list[str] = []
    is_active: bool = True

    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TwitchAdminTokenCreate(BaseModel):
    twitch_user_id: str | None = None
    twitch_username: str | None = None
    twitch_email: str | None = None

    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"

    expires_in: int | None = None
    expires_at: datetime | None = None

    scope: list[str] = []
    is_active: bool = True


class TwitchAdminTokenUpdate(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None
    expires_in: int | None = None
    expires_at: datetime | None = None
    scope: list[str] | None = None
    is_active: bool | None = None
