from datetime import datetime
from enum import StrEnum
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from src.models.order import OrderDomain
from src._types import (
    TrackSource,
    ContentSettingScope,
    DonationRuleScope,
    ChatRuleScope,
    BlockListScope,
)


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
    slug: str
    currency: str
    amount: float
    priority: int
    content_settings: Optional[dict] = None


class ChatRulesSchema(SubSchema):
    platform: ChatRuleScope
    key: str
    priority: int
    content_settings: Optional[dict] = None
    overrive_order: Optional[int] = None


class ContentSettingsPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: Optional[ContentSettingScope] = None
    min_views: Optional[int] = None
    min_likes: Optional[int] = None
    max_duration: Optional[int] = None
    track_cooldown: Optional[int] = None
    user_cooldown: Optional[int] = None


class BlockListPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trigger_type: Optional[BlockTrigger] = None
    trigger_value: Optional[str] = None
    platform: Optional[BlockListScope] = None


class DonationRulesPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: Optional[DonationRuleScope] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    currency: Optional[str] = None
    amount: Optional[float] = None
    priority: Optional[int] = None
    content_settings: Optional[dict] = None


class ChatRulesPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: Optional[ChatRuleScope] = None
    key: Optional[str] = None
    priority: Optional[int] = None
    content_settings: Optional[dict] = None
    overrive_order: Optional[int] = None


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
    is_favorite: bool
    show_in_widget: bool

    track_data: list[OrderDomain] = Field(default_factory=list)
    active_tracks: list[OrderDomain] = Field(default_factory=list)
    now_playing: str | None = Field(None)

    max_playlist_size: int
    mode: Literal["flow", "stream", "static"]
    repeat_mode: Literal["all", "once", "none"]
    mode_settings: Dict[str, Any]
    sync_playback_position: bool
    shuffle: bool
    cost_mode: Literal["add", "max"]

    track_black_list: List[str] = []

    # Relationships
    content_settings: List[ContentSettingsSchema] = []
    block_list: List[BlockListSchema] = []
    donation_rules: List[DonationRulesSchema] = []
    chat_rules: List[ChatRulesSchema] = []

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
    show_in_widget: bool | None = None

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


class DonationRulesCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    settings_id: UUID
    platform: DonationRuleScope
    name: str = "Donation"
    slug: str = "donation"
    currency: str = Field("USD", min_length=3, max_length=3)
    amount: float = 5.0
    priority: int = 0
    content_settings: Optional[dict] = None


class ChatRulesCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    settings_id: UUID
    platform: ChatRuleScope
    key: str = Field(..., max_length=255)
    priority: int
    content_settings: Optional[dict] = None
    overrive_order: Optional[int] = None


class ContentSettingsCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: ContentSettingScope
    settings_id: UUID
    min_views: int = 10_000
    min_likes: int = 500
    max_duration: int = 600
    track_cooldown: int = 0
    user_cooldown: int = 2


class BlockListCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    settings_id: UUID
    trigger_type: BlockTrigger
    trigger_value: str = Field(..., max_length=255)
    platform: BlockListScope
