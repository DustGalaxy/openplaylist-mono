from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class Platform(Enum):
    TWITCH = "twitch"
    DA = "donationalerts"
    GOOGLE = "google"


class ConnectionData(BaseModel):
    user_id: UUID
    platform: Platform
    platform_user_id: str

    access_token: str
    refresh_token: str
    expires_at: int

    model_config = ConfigDict(from_attributes=True)


class DATokenRefreshed(BaseModel):
    user_id: UUID
    platform_user_id: str
    access_token: str
    refresh_token: str | None
    expires_at: int


class DAUser(BaseModel):
    user_id: UUID
    da_id: str
    access_token: str
    refresh_token: str
    expires_at: int

    model_config = ConfigDict(from_attributes=True)


class SortSettings(BaseModel):
    date: Literal["asc", "desc", "none"]
    priority: Literal["asc", "desc", "none"]
    shuffle: Literal["asc", "desc", "none"]


class PlaylistSettingsDomain(BaseModel):
    id: UUID
    playlist_id: UUID

    min_views: int = Field(..., ge=0)
    min_likes: int = Field(..., ge=0)
    max_duration: int = Field(..., ge=0)

    is_active: bool
    is_public: bool
    is_favorite: bool

    mode: Literal["flow", "static"]
    repeat_mode: Literal["all", "once", "none"]
    sort_settings: SortSettings

    cost_broacaster: int
    cost_donater: int
    cost_vip: int
    cost_mod: int
    cost_subscriber: int
    cost_turbo: int
    cost_artist: int
    cost_fonder: int
    cost_follower: int

    cost_mode: Literal["add", "max"]

    track_black_list: list[str] = Field(default_factory=list)
    user_black_list: list[str] = Field(default_factory=list)

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
