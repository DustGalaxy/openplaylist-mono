from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PlayerState(BaseModel):
    owner_id: UUID
    active_playlist_id: UUID | None = None
    current_track_id: str | None = None
    current_track_data: dict[str, Any] | None = None
    position: float = 0.0
    is_paused: bool = True
    volume: int = 80
    broadcast_to_widget: bool = True
    last_client_id: str | None = None
    updated_at: datetime | str | None = None

    model_config = ConfigDict(from_attributes=True)


class PlayerPlayRequest(BaseModel):
    track_id: str
    playlist_id: UUID
    client_id: str
    position: float = 0.0


class PlayerPauseRequest(BaseModel):
    is_paused: bool
    position: float = 0.0
    client_id: str


class PlayerSeekRequest(BaseModel):
    position: float
    client_id: str


class PlayerVolumeRequest(BaseModel):
    volume: int = Field(..., ge=0, le=100)
    client_id: str


class PlayerBroadcastRequest(BaseModel):
    enabled: bool
    client_id: str
