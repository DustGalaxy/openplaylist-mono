from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

if TYPE_CHECKING:
    from src.models.linked_accounts import LinkedAccountsDomain

from pydantic import BaseModel, ConfigDict


class TokenVaultDomain(BaseModel):
    id: UUID

    linked_account_id: UUID
    linked_account: "LinkedAccountsDomain"

    access_token: str
    refresh_token: str | None
    token_type: str
    expires_at: int | None

    last_update: datetime

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenVaultCreate(BaseModel):
    linked_account_id: UUID
    access_token: str
    refresh_token: str | None = None
    token_type: str
    expires_at: int | None = None
    last_update: datetime = datetime.now()


class TokenVaultUpdate(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None
    expires_at: int | None = None
    last_update: datetime | None = None
