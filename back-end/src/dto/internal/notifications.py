from uuid import UUID

from pydantic import BaseModel

from src._types import PlaylistEventType, UserEventType


class BaseEvent(BaseModel):
    target_id: UUID
    target_type: str

    event_type: PlaylistEventType | UserEventType
