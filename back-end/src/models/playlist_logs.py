from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src._types import PlaylistLogsEventTypes


class PlaylistLogSchema(BaseModel):
    id: UUID
    user_id: UUID
    playlist_id: UUID
    event_type: PlaylistLogsEventTypes
    event_data: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlaylistLogCreate(BaseModel):
    user_id: UUID
    playlist_id: UUID
    event_type: PlaylistLogsEventTypes
    event_data: dict
