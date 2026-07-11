from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.fields import Field

from src._types import NotificationType


# --- shared
class AddTrackEventNotification(BaseModel):
    playlist_name: str
    track_title: str


class ReadNotification(BaseModel):
    id: UUID

    type: NotificationType
    data: dict

    is_read: bool

    created_at: datetime


# --- event


class EvetnNotification(BaseModel):
    id: UUID

    target_id: UUID
    target_type: str

    event_type: NotificationType
    event_data: dict

    created_at: datetime


class EventNotificationCreate(BaseModel):
    target_id: UUID
    target_type: str

    event_type: NotificationType
    event_data: dict


# --- direct


class DirectNotification(BaseModel):
    id: UUID

    user_id: UUID

    notification_type: NotificationType
    notification_data: dict

    is_read: bool

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DirectNotificationCreate(BaseModel):
    user_id: UUID

    notification_type: NotificationType
    notification_data: dict


# --- notification settings


class NotificationMuteFiltersDTO(BaseModel):
    muted_event_types: list[str] = Field(default_factory=list)
    muted_target_types: list[str] = Field(default_factory=list)


class NotificationSettings(BaseModel):
    id: UUID
    user_id: UUID

    filters: NotificationMuteFiltersDTO

    last_notification_read_ts: datetime

    created_at: datetime
    updated_at: datetime


class NotificationSettingsCreate(BaseModel):
    user_id: UUID


class NotificationSettingsPatch(BaseModel):
    filters: NotificationMuteFiltersDTO | None = None

    last_notification_read_ts: datetime | None = None


# --- subscription


class Subscription(BaseModel):
    id: UUID

    user_id: UUID

    target_id: UUID
    target_type: str

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubscriptionCreate(BaseModel):
    user_id: UUID

    target_id: UUID
    target_type: str
