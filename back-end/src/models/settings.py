from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from src._types import (
    ContentSettingScope,
    DonationRuleScope,
    ChatRuleScope,
    BlockListScope,
)

# --- Enums ---


class BlockTrigger(str, Enum):
    USER_ID = "USER_ID"
    USER_NAME = "USER_NAME"


# --- Shared Base ---


class BaseSchema(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SubSchema(BaseSchema):
    settings_id: UUID


# --- Related Models ---


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


# --- Main Model ---


class SettingsSchema(BaseSchema):
    playlist_id: UUID
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


# --- Patch Schemas (Все поля Optional) ---


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


class SettingsPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    max_playlist_size: Optional[int] = None
    mode: Optional[Literal["flow", "stream", "static"]] = None
    repeat_mode: Optional[Literal["all", "once", "none"]] = None
    # sort_settings: Optional[SortSettings] = None
    mode_settings: Optional[Dict[str, Any]] = None
    sync_playback_position: Optional[bool] = None
    shuffle: Optional[bool] = None
    cost_mode: Optional[Literal["add", "max"]] = None
    track_black_list: Optional[List[str]] = None


# --- Create Schemas (Без ID и Timestamp) ---


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


class SettingsCreate(BaseModel): ...
