from datetime import datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from src._types import IntegrationPlatform


class UserDTO(BaseModel):
    id: UUID
    twitch_id: str


class HttpClassicLogin(BaseModel):
    email: str
    password: str


class HttpClassicRegister(BaseModel):
    username: str
    email: str
    password: str


class UserRead(BaseModel):
    id: UUID
    username: str
    email: str
    email_confirmed: bool
    profile_image_url: str = Field(alias="avatar_url")
    social_links: dict[str, str] | None = None

    model_config = ConfigDict(from_attributes=True)


class IntegrationType(BaseModel):
    type: Literal["twitch", "da"]


class IntegrationRead(BaseModel):
    id: UUID
    platform: IntegrationPlatform
    platform_user_id: str
    platform_avatar_url: str
    platform_username: str
    bot_connection: bool
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
