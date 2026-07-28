from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.fields import Field

from src._types import NotificationType, PlaylistEventType, TargetType, UserEventType, UserTypes, PlaylistTypes


# --- shared
class AddTrackEventNotification(BaseModel):
    playlist_name: str
    track_title: str


class ReadNotification(BaseModel):
    id: UUID

    type: NotificationType | UserEventType | PlaylistEventType
    data: dict

    is_read: bool

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- event


class EvetnNotification(BaseModel):
    id: UUID

    target_id: UUID
    target_type: str

    event_type: PlaylistEventType | UserEventType
    event_data: UserTypes | PlaylistTypes

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventNotificationCreate(BaseModel):
    target_id: UUID
    target_type: str

    event_type: PlaylistEventType | UserEventType
    event_data: UserTypes | PlaylistTypes


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

    model_config = ConfigDict(from_attributes=True)


class NotificationSettingsCreate(BaseModel):
    user_id: UUID


class NotificationSettingsPatch(BaseModel):
    filters: NotificationMuteFiltersDTO | None = None

    last_notification_read_ts: datetime | None = None


# --- subscription


class SubscriptionSettings(BaseModel):
    allowed_event_types: list[PlaylistEventType | UserEventType] = Field(default_factory=list)


class Subscription(BaseModel):
    id: UUID

    user_id: UUID

    target_id: UUID
    target_type: str
    target_name: str

    settings: SubscriptionSettings

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubscriptionCreate(BaseModel):
    user_id: UUID
    target_id: UUID
    target_type: TargetType
    target_name: str
    settings: SubscriptionSettings | None = None

    # @model_validator(mode="after")
    # def validate_events_for_target(self) -> Self:
    #     if not self.settings:
    #         return self

    #     allowed_set = NOTIFICATION_EVENTS_MAP.get(self.target_type, set())
    #     for event in self.settings.allowed_event_types:
    #         if event not in allowed_set:
    #             raise ValueError(f"Ивент '{event}' недопустим для типа подписки '{self.target_type}'")
    #     return self


class SubscriptionPatch(BaseModel):
    tagret_id: UUID | None = None
    target_type: TargetType | None = None
    target_name: str | None = None
    settings: SubscriptionSettings | None = None

    # @model_validator(mode="after")
    # def validate_events_for_target(self) -> Self:
    #     allowed_set = NOTIFICATION_EVENTS_MAP.get(self.target_type, set())

    #     for event in self.settings.allowed_event_types:
    #         if event not in allowed_set:
    #             raise ValueError(f"Ивент '{event}' недопустим для типа подписки '{self.target_type}'")
    #     return self
