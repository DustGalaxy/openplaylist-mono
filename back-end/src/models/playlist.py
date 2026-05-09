from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from .order import OrderDomain
from _types import Platform


class AllowedSource(BaseModel):
    platform: Platform
    platform_user_id: str


class PlaylistSchema(BaseModel):
    id: UUID

    owner_id: UUID
    owner_nickname: str
    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)
    tags: list[str] = Field(default_factory=list)

    is_allow_external_requests: bool
    allow_sources: list[AllowedSource] = Field(default_factory=list)
    is_public: bool
    is_favorite: bool

    track_data: list[OrderDomain] = Field(default_factory=list)
    active_tracks: list[OrderDomain] = Field(default_factory=list)
    now_playing: str | None = Field(None)

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    def set_play_now(self, track_id: str):
        self.now_playing = track_id


class PlaylistPatch(BaseModel):
    name: str | None = None
    description: str | None = None
    track_data: list[OrderDomain] | None = None
    now_playing: str | None = None
    tags: list[str] | None = None
    allow_sources: list[AllowedSource] | None = None
    is_public: bool | None = None
    is_favorite: bool | None = None
    is_allow_external_requests: bool | None = None

    model_config = ConfigDict(from_attributes=True)


class PlaylistCreate(BaseModel):
    owner_id: UUID
    owner_nickname: str
    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)
    tags: list[str] = Field(default_factory=list)
    is_allow_external_requests: bool = False
    allow_sources: list[AllowedSource] = Field(default_factory=list)
    is_public: bool = False
    is_favorite: bool = False

    model_config = ConfigDict(from_attributes=True)
