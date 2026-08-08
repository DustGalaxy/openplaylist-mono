from typing import Self
from uuid import UUID

from pydantic import BaseModel
from pydantic.functional_validators import model_validator

from src._types import NOTIFICATION_EVENT_TYPES_MAP, TargetType
from src.models.notification import SubscriptionSettings


class NewSubscription(BaseModel):
    target_id: UUID
    target_type: TargetType
    target_name: str
    settings: SubscriptionSettings | None = None

    @model_validator(mode="after")
    def validate_events_for_target(self) -> Self:
        if not self.settings:
            return self

        allowed_set = NOTIFICATION_EVENT_TYPES_MAP.get(self.target_type, set())
        for event in self.settings.allowed_event_types:
            if event not in allowed_set:
                raise ValueError(f"Ивент '{event}' недопустим для типа подписки '{self.target_type}'")
        return self


class ChangeSettingsSubscription(BaseModel):
    target_type: TargetType
    settings: SubscriptionSettings

    @model_validator(mode="after")
    def validate_events_for_target(self) -> Self:
        allowed_set = NOTIFICATION_EVENT_TYPES_MAP.get(self.target_type, set())

        for event in self.settings.allowed_event_types:
            if event not in allowed_set:
                raise ValueError(f"Ивент '{event}' недопустим для типа подписки '{self.target_type}'")
        return self
