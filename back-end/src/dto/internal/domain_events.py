from datetime import datetime
from enum import StrEnum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src._types import IntegrationPlatform
from src.models.order import OrderCreate, OrderDomain
from src.models.playlist import AllowedSource


class PlaylistSettings(BaseModel):
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
    show_in_widget: bool
    now_playing: str | None = Field(None)

    max_playlist_size: int
    mode: Literal["flow", "stream", "static"]
    repeat_mode: Literal["all", "once", "none"]
    mode_settings: dict[str, Any]
    sync_playback_position: bool
    cost_mode: Literal["add", "max"]

    track_black_list: list[str] = []
    background_track_ids: list[str] = []

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InternalPlaylistEventType(StrEnum):
    TRACK_ADDED = "track.added"
    TRACK_ADDED_BULK = "track.added.bulk"
    TRACK_REJECTED = "track.rejected"
    TRACK_REMOVED = "track.removed"
    TRACK_REMOVED_BULK = "track.removed.bulk"
    TRACK_PLAY = "track.play"
    TRACK_LISTENED = "track.listened"
    TRACK_SKIPPED = "track.skipped"
    TRACK_REPORTED = "track.reported"

    PLAYLIST_SETTINGS_CHANGED = "playlist.settings.changed"

    PLAYLIST_CREATED = "playlist.created"
    PLAYLIST_DELETED = "playlist.deleted"


class InternalPlaylistEvent(BaseModel):
    event_id: UUID
    event_type: InternalPlaylistEventType

    playlist_id: UUID
    playlist_name: str
    playlist_is_public: bool
    show_in_widget: bool
    user_id: UUID
    user_name: str

    track: OrderDomain | OrderCreate | None = None
    bulk_ids: list[UUID] | None = None
    playlist_data: PlaylistSettings | None = None
    error_list: list[str] | None = None


class InternalUserEventType(StrEnum):
    USER_CREATED = "user.created"
    INTEGRATION_DIED = "integration.died"


class InternalUserEvent(BaseModel):
    event_id: UUID
    event_type: InternalUserEventType

    user_id: UUID
    user_name: str

    died_integration: IntegrationPlatform | None = None
