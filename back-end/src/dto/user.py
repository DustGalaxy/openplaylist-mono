from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src._types import IntegrationPlatform
from src.models.auth_user import Role


class HttpClassicLogin(BaseModel):
    email: str
    password: str


class HttpClassicRegister(BaseModel):
    username: str
    email: str
    password: str


class PublicRole(BaseModel):
    id: str
    user_id: UUID

    tier: int
    start_date: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicUserRead(BaseModel):
    id: UUID
    username: str
    bio: str
    profile_image_url: str = Field(alias="avatar_url")
    social_links: dict[str, str] | None = None
    roles: list[PublicRole] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class UserRead(BaseModel):
    id: UUID
    username: str
    bio: str
    email: str
    email_confirmed: bool
    is_public: bool
    profile_image_url: str = Field(alias="avatar_url")
    social_links: dict[str, str] | None = None
    roles: list[Role] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class UserPatch(BaseModel):
    username: str | None = None
    email: str | None = None
    password: str | None = None
    bio: str | None = None
    is_public: bool | None = None 
    avatar_url: str | None = Field(None, alias="profile_image_url")
    social_links: dict[str, str] | None = None


class IntegrationRead(BaseModel):
    id: UUID
    platform: IntegrationPlatform
    platform_user_id: str
    platform_avatar_url: str
    platform_username: str

    bot_connection: bool
    bot_settings: dict | None
    is_dead: bool

    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# class LinkedAccountWithTokensRead(BaseModel):
#     id: UUID
#     user_id: UUID
#     platform: Platform
#     platform_user_id: str

#     access_token: str
#     refresh_token: str
#     expires_at: int

#     model_config = ConfigDict(from_attributes=True)
