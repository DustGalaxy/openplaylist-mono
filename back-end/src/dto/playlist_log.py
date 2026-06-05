from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src._types import PlaylistLogsEventTypes


class ReadPlaylistLog(BaseModel):
    id: UUID
    event_type: PlaylistLogsEventTypes
    event_data: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
