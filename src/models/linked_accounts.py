from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from _types import Platform


class LinkedAccountsDomain(BaseModel):
    id: UUID

    user_id: UUID

    platform: Platform
    platform_user_id: str
    platform_username: str
    platform_avatar_url: str

    bot_connection: bool

    access_token: str
    refresh_token: str
    expires_at: int

    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LinkedAccountsCreate(BaseModel):
    user_id: UUID

    platform: Platform
    platform_user_id: str
    platform_username: str
    platform_avatar_url: str

    access_token: str
    refresh_token: str
    expires_at: int


class LinkedAccountsUpdate(BaseModel):
    platform_username: str | None = None
    platform_avatar_url: str | None = None
    bot_connection: bool | None = None

    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: int | None = None
