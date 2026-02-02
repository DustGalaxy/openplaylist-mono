from datetime import datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from _types import Source


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

    is_public: bool
    is_favorite: bool

    donation_currency_amount: float
    track_cooldown: int
    user_cooldown: int

    max_playlist_size: int

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

    allow_sources: list[Source] = Field(default_factory=list)
    is_allow_external_requests: bool

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlaylistSettingsPatch(BaseModel):
    min_views: int | None = Field(None, ge=0, description="Minimum views required for the playlist")
    min_likes: int | None = Field(None, ge=0, description="Minimum likes required for the playlist")
    max_duration: int | None = Field(None, ge=0, description="Maximum duration in seconds for the playlist")
    is_public: bool | None = Field(None, description="Indicates if the playlist is public")
    is_favorite: bool | None = Field(None, description="Indicates if the playlist is marked as favorite")

    mode: Literal["flow", "static"] | None = Field(None, description="Playlist mode")
    repeat_mode: Literal["all", "once", "none"] | None = Field(None, description="Playlist repeat mode")
    sort_settings: SortSettings | None = Field(None, description="Playlist sort settings")

    cost_broacaster: int | None = Field(None)
    cost_donater: int | None = Field(None)
    cost_vip: int | None = Field(None)
    cost_mod: int | None = Field(None)
    cost_subscriber: int | None = Field(None)
    cost_turbo: int | None = Field(None)
    cost_artist: int | None = Field(None)
    cost_fonder: int | None = Field(None)
    cost_follower: int | None = Field(None)

    cost_mode: Literal["add", "max"] | None = Field(None)

    track_black_list: list[str] | None = Field(None, description="List of track IDs to exclude from the playlist")
    user_black_list: list[int] | None = Field(None, description="List of user IDs to exclude from the playlist")

    allow_sources: list[Source] | None = Field(None)
    is_allow_external_requests: bool | None = Field(None)


class PlaylistSettingsCreate(BaseModel): ...
