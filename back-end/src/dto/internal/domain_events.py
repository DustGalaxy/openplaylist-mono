from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel

from src.models.order import OrderCreate, OrderDomain


class InternalPlaylistEventType(StrEnum):
    TRACK_ADDED = "track.added"
    TRACK_REJECTED = "track.rejected"
    TRACK_REMOVED = "track.removed"
    TRACK_PLAY = "track.play"
    TRACK_LISTENED = "track.listened"
    TRACK_SKIPPED = "track.skipped"
    TRACK_REPORTED = "track.reported"

    PLAYLIST_RENAMED = "playlist.renamed"
    PLAYLIST_VISIABILITY_CHANGED = "playlist.visialbility_changed"
    PLAYLIST_SYNC_CHANGED = "playlist.sync_changed"
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

    track: OrderDomain  | OrderCreate | None = None
    renamed_data: dict[str, str] | None = None
    visiability_data: dict[str, str] | None = None
    sync_data: dict[str, str] | None = None
    error_list: list[str] | None = None