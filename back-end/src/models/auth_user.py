from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.linked_accounts import LinkedAccountsDomain


class Role(BaseModel):
    id: str
    user_id: UUID

    tier: int
    start_date: datetime
    expires_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class AuthUserSchema(BaseModel):
    id: UUID

    username: str
    bio: str
    email: str
    email_confirmed: bool
    password: str | None = None
    avatar_url: str | None = None

    vip_expires_at: datetime | None = None
    is_public: bool
    is_active: bool

    linked_accounts: list[LinkedAccountsDomain] = Field(default_factory=list)
    social_links: dict[str, str] | None = None
    roles: list[Role] = Field(default_factory=list)

    last_login: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthUserCreate(BaseModel):
    last_login: datetime = Field(default_factory=datetime.now)
    username: str
    email: str
    email_confirmed: bool = False
    avatar_url: str | None = None
    password: str | None = None


class AuthUserUpdate(BaseModel):
    last_login: datetime | None = None
    username: str | None = None
    bio: str | None = None
    email: str | None = None
    email_confirmed: bool | None = None
    password: str | None = None
    avatar_url: str | None = None
    is_public: bool | None = None
    social_links: dict[str, str] | None = None

    model_config = ConfigDict(from_attributes=True)
