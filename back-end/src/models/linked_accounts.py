from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src._types import IntegrationPlatform

if TYPE_CHECKING:
    from src.models.token_vault import TokenVaultDomain


class LinkedAccountsDomain(BaseModel):
    id: UUID

    user_id: UUID

    platform: IntegrationPlatform
    platform_user_id: str
    platform_username: str
    platform_avatar_url: str
    platform_user_email: str | None

    bot_connection: bool

    tokens: "TokenVaultDomain"

    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LinkedAccountsCreate(BaseModel):
    user_id: UUID

    platform: IntegrationPlatform
    platform_user_id: str
    platform_username: str
    platform_avatar_url: str
    platform_user_email: str | None


class LinkedAccountsUpdate(BaseModel):
    platform_username: str | None = None
    platform_avatar_url: str | None = None
    bot_connection: bool | None = None
