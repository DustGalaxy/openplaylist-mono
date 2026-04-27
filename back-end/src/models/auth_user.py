from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from models.linked_accounts import LinkedAccountsDomain


class AuthUserSchema(BaseModel):
    id: UUID

    username: str
    email: str
    avatar_url: str | None

    vip_expires_at: datetime | None
    is_active: bool

    linked_accounts: list[LinkedAccountsDomain]

    last_login: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthUserCreate(BaseModel):
    last_login: datetime = Field(default_factory=datetime.now)
    username: str
    email: str
    avatar_url: str | None = None


class AuthUserUpdate(BaseModel):
    last_login: datetime | None = None
    username: str | None = None
    email: str | None = None
    avatar_url: str | None = None
