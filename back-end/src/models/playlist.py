from datetime import datetime
from enum import StrEnum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src._types import (
    BlockListScope,
    ChatRuleScope,
    ContentSettingScope,
    DonationRuleScope,
    TrackSource,
)
from src.models.moderator import ModeratorPlaylistAccessSchema
from src.models.order import OrderDomain


class BlockTrigger(StrEnum):
    USER_ID = "USER_ID"
    USER_NAME = "USER_NAME"


class BaseSchema(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SubSchema(BaseSchema):
    playlist_id: UUID


class ContentSettingsSchema(SubSchema):
    platform: ContentSettingScope
    min_views: int
    min_likes: int
    max_duration: int
    track_cooldown: int
    user_cooldown: int


class BlockListSchema(SubSchema):
    trigger_type: BlockTrigger
    trigger_value: str
    platform: BlockListScope


class DonationRulesSchema(SubSchema):
    platform: DonationRuleScope
    name: str
    currency: str
    amount: float
    priority: int
    content_settings: dict | None = None


class ChatRulesSchema(SubSchema):
    platform: ChatRuleScope
    key: str
    priority: int
    content_settings: dict | None = None
    overrive_order: int | None = None


class ContentSettingsPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: ContentSettingScope | None = None
    min_views: int | None = None
    min_likes: int | None = None
    max_duration: int | None = None
    track_cooldown: int | None = None
    user_cooldown: int | None = None


class BlockListPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trigger_type: BlockTrigger | None = None
    trigger_value: str | None = None
    platform: BlockListScope | None = None


class DonationRulesPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: DonationRuleScope | None = None
    name: str | None = None
    currency: str | None = None
    amount: float | None = None
    priority: int | None = None
    content_settings: dict | None = None


class ChatRulesPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: ChatRuleScope | None = None
    key: str | None = None
    priority: int | None = None
    content_settings: dict | None = None
    overrive_order: int | None = None


class AllowedSource(BaseModel):
    platform: TrackSource
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
    favorites_count: int = 0

    track_data: list[OrderDomain] = Field(default_factory=list)
    active_tracks: list[OrderDomain] = Field(default_factory=list)
    now_playing: str | None = Field(None)

    max_playlist_size: int
    mode: Literal["flow", "stream", "static"]
    repeat_mode: Literal["all", "once", "none"]
    mode_settings: dict[str, Any]
    sync_playback_position: bool
    cost_mode: Literal["add", "max"]

    track_black_list: list[str] = []
    background_track_ids: list[str] = []
    # Relationships
    content_settings: list[ContentSettingsSchema] = []
    block_list: list[BlockListSchema] = []
    donation_rules: list[DonationRulesSchema] = []
    chat_rules: list[ChatRulesSchema] = []
    moderator_access: list[ModeratorPlaylistAccessSchema] = []

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
    is_allow_external_requests: bool | None = None
    max_playlist_size: int | None = None
    mode: Literal["flow", "stream", "static"] | None = None
    repeat_mode: Literal["all", "once", "none"] | None = None
    mode_settings: dict[str, Any] | None = None
    sync_playback_position: bool | None = None
    cost_mode: Literal["add", "max"] | None = None

    track_black_list: list[str] | None = None
    background_track_ids: list[str] | None = None

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

    model_config = ConfigDict(from_attributes=True)


class DonationRulesCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    playlist_id: UUID
    platform: DonationRuleScope
    name: str = "Donation"
    currency: str = Field("USD", min_length=3, max_length=3)
    amount: float = 5.0
    priority: int = 0
    content_settings: dict | None = None


class ChatRulesCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    playlist_id: UUID
    platform: ChatRuleScope
    key: str = Field(..., max_length=255)
    priority: int
    content_settings: dict | None = None
    overrive_order: int | None = None


class ContentSettingsCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: ContentSettingScope
    playlist_id: UUID
    min_views: int = 10_000
    min_likes: int = 500
    max_duration: int = 600
    track_cooldown: int = 0
    user_cooldown: int = 2


class BlockListCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    playlist_id: UUID
    trigger_type: BlockTrigger
    trigger_value: str = Field(..., max_length=255)
    platform: BlockListScope
