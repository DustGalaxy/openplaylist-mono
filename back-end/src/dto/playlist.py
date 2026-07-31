from datetime import datetime
from typing import Any, Dict, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src._types import BlockListScope, ChatRuleScope, ContentSettingScope, DeleteStatus, DonationRuleScope
from src.dto.settings import ReadPlaylistSettings
from src.models.order import OrderDomain
from src.models.playlist import AllowedSource


class TrackDeleteBulk(BaseModel):
    track_ids: list[UUID]
    reason: DeleteStatus = "listened"

# class TrackAddBulk(BaseModel):
#     track_ids: list[UUID]


class ReadContentSettings(BaseModel):
    id: UUID
    playlist_id: UUID

    platform: ContentSettingScope
    min_views: int
    min_likes: int
    max_duration: int
    track_cooldown: int
    user_cooldown: int

    model_config = ConfigDict(from_attributes=True)


class ReadBlockList(BaseModel):
    id: UUID
    playlist_id: UUID

    platform: BlockListScope
    trigger_type: str
    trigger_value: str

    model_config = ConfigDict(from_attributes=True)


class ReadDonationRules(BaseModel):
    id: UUID
    playlist_id: UUID

    platform: DonationRuleScope
    name: str
    currency: str = Field("USD", min_length=3, max_length=3)
    amount: float = Field(5.0, ge=0.0)
    priority: int
    content_settings: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class ReadChatRules(BaseModel):
    id: UUID
    playlist_id: UUID

    platform: ChatRuleScope
    key: str
    priority: int
    content_settings: Optional[dict] = None
    overrive_order: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ReadPlaylist(BaseModel):
    id: UUID
    owner_id: UUID
    owner_nickname: str

    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)
    tags: list[str] = Field(default_factory=list)

    is_public: bool
    is_favorite: bool
    is_allow_external_requests: bool
    allow_sources: list[AllowedSource]
    show_in_widget: bool

    now_playing: str | None = Field(None)

    track_data: list[OrderDomain] = Field(default_factory=list)

    max_playlist_size: int = Field(0, ge=0)

    mode: Literal["flow", "stream", "static"]
    repeat_mode: Literal["all", "once", "none"]
    mode_settings: Dict[str, Any]
    sync_playback_position: bool
    cost_mode: Literal["add", "max"]

    track_black_list: list[str] = Field(default_factory=list)
    background_track_ids: list[str] = []
    content_settings: list[ReadContentSettings] = Field(default_factory=list)
    block_list: list[ReadBlockList] = Field(default_factory=list)
    donation_rules: list[ReadDonationRules] = Field(default_factory=list)
    chat_rules: list[ReadChatRules] = Field(default_factory=list)

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReadPlaylistPreview(BaseModel):
    id: UUID = Field(..., description="Unique identifier for the playlist")

    owner_nickname: str = Field(..., description="Nickname of the owner of the playlist")
    name: str = Field(..., max_length=100, description="Name of the playlist")
    description: str | None = Field(None, max_length=500, description="Description of the playlist")

    created_at: datetime = Field(..., description="Creation timestamp of the playlist")
    updated_at: datetime = Field(..., description="Last update timestamp of the playlist")

    model_config = ConfigDict(from_attributes=True)


class PlaylistBaseinfo(BaseModel):
    id: UUID = Field(..., description="Unique identifier for the playlist")
    owner_id: UUID = Field(..., description="ID of the owner of the playlist")

    now_playing: str | None = Field(None, description="Currently playing track ID")
    is_allow_external_requests: bool = Field(..., description="Indicates if the playlist is active")
    is_public: bool = Field(..., description="Indicates if the playlist is public")

    model_config = ConfigDict(from_attributes=True)


class NewPlaylist(BaseModel):
    name: str
    description: str
    show_in_widget: bool


class PlayNow(BaseModel):
    track_id: str | None
    playlist_id: UUID
