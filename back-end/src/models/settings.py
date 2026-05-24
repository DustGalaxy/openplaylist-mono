from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from _types import Platform, DonationPlatform, ChatPlatform, _All_Platforms, DB_DonationPlatform


class SortSettings(BaseModel):
    date: Literal["asc", "desc", "none"]
    priority: Literal["asc", "desc", "none"]
    shuffle: Literal["asc", "desc", "none"]


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
    platform: _All_Platforms
    min_views: int
    min_likes: int
    max_duration: int
    track_cooldown: int
    user_cooldown: int


class BlockListSchema(SubSchema):
    trigger_type: BlockTrigger
    trigger_value: str
    platform: Platform


class DonationRulesSchema(SubSchema):
    platform: _All_Platforms
    name: str
    slug: str
    currency: str
    amount: float
    priority: int
    content_settings: Optional[dict] = None


class ChatRulesSchema(SubSchema):
    platform: ChatPlatform
    key: str
    priority: int
    content_settings: Optional[dict] = None
    overrive_order: Optional[int] = None


# --- Main Model ---


class SettingsSchema(BaseSchema):
    playlist_id: UUID
    max_playlist_size: int
    mode: Literal["flow", "static"]
    repeat_mode: Literal["all", "once", "none"]
    sort_settings: SortSettings
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

    platform: Optional[_All_Platforms] = None
    min_views: Optional[int] = None
    min_likes: Optional[int] = None
    max_duration: Optional[int] = None
    track_cooldown: Optional[int] = None
    user_cooldown: Optional[int] = None


class BlockListPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trigger_type: Optional[BlockTrigger] = None
    trigger_value: Optional[str] = None
    platform: Optional[Platform] = None


class DonationRulesPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: Optional[DB_DonationPlatform] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    currency: Optional[str] = None
    amount: Optional[float] = None
    priority: Optional[int] = None
    content_settings: Optional[dict] = None


class ChatRulesPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: Optional[ChatPlatform] = None
    key: Optional[str] = None
    priority: Optional[int] = None
    content_settings: Optional[dict] = None
    overrive_order: Optional[int] = None


class SettingsPatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    max_playlist_size: Optional[int] = None
    mode: Optional[Literal["flow", "static"]] = None
    repeat_mode: Optional[Literal["all", "once", "none"]] = None
    sort_settings: Optional[SortSettings] = None
    cost_mode: Optional[Literal["add", "max"]] = None
    track_black_list: Optional[List[str]] = None


# --- Create Schemas (Без ID и Timestamp) ---


class DonationRulesCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    settings_id: UUID
    platform: DB_DonationPlatform
    name: str = "Donation"
    slug: str = "donation"
    currency: str = Field("USD", min_length=3, max_length=3)
    amount: float = 5.0
    priority: int = 0
    content_settings: Optional[dict] = None


class ChatRulesCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    settings_id: UUID
    platform: ChatPlatform
    key: str = Field(..., max_length=255)
    priority: int
    content_settings: Optional[dict] = None
    overrive_order: Optional[int] = None


class ContentSettingsCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: _All_Platforms
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
    platform: Platform


class SettingsCreate(BaseModel): ...
