from datetime import datetime
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

from src.models.settings import SortSettings
from src._types import ContentSettingScope, DonationRuleScope, ChatRuleScope, BlockListScope


class ReadContentSettings(BaseModel):
    id: UUID
    settings_id: UUID

    platform: ContentSettingScope
    min_views: int
    min_likes: int
    max_duration: int
    track_cooldown: int
    user_cooldown: int

    model_config = ConfigDict(from_attributes=True)


class ReadBlockList(BaseModel):
    id: UUID
    settings_id: UUID

    platform: BlockListScope
    trigger_type: str
    trigger_value: str

    model_config = ConfigDict(from_attributes=True)


class ReadDonationRules(BaseModel):
    id: UUID
    settings_id: UUID

    platform: DonationRuleScope
    name: str
    slug: str
    currency: str = Field("USD", min_length=3, max_length=3)
    amount: float = Field(5.0, ge=0.0)
    priority: int
    content_settings: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class ReadChatRules(BaseModel):
    id: UUID
    settings_id: UUID

    platform: ChatRuleScope
    key: str
    priority: int
    content_settings: Optional[dict] = None
    overrive_order: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ReadPlaylistSettings(BaseModel):
    id: UUID
    playlist_id: UUID

    max_playlist_size: int = Field(0, ge=0)

    mode: Literal["flow", "static"]
    repeat_mode: Literal["all", "once", "none"]
    sort_settings: SortSettings
    cost_mode: Literal["add", "max"]

    track_black_list: list[str] = Field(default_factory=list)

    content_settings: list[ReadContentSettings] = Field(default_factory=list)
    block_list: list[ReadBlockList] = Field(default_factory=list)
    donation_rules: list[ReadDonationRules] = Field(default_factory=list)
    chat_rules: list[ReadChatRules] = Field(default_factory=list)

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
