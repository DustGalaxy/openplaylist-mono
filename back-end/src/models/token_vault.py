from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src._types import IntegrationPlatform


class TokenVaultDomain(BaseModel):
    id: UUID

    user_id: UUID
    linked_account_id: UUID

    platform: IntegrationPlatform
    platform_user_id: str

    access_token: str
    refresh_token: str
    token_type: str
    expires_at: int
    last_update: datetime

    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TokenVaultCreate(BaseModel):
    user_id: UUID
    linked_account_id: UUID

    platform: IntegrationPlatform
    platform_user_id: str

    access_token: str
    refresh_token: str
    token_type: str
    expires_at: int
    last_update: datetime = datetime.now()


class TokenVaultUpdate(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None
    expires_at: int | None = None
    last_update: datetime | None = None
