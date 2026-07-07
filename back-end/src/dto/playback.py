from uuid import UUID

from pydantic import BaseModel


class StoredState(BaseModel):
    owner_id: UUID
    is_paused: bool
    position: float
    track_id: UUID | None


class Pause(BaseModel):
    is_paused: bool
    position: float
    track_id: UUID | None


class Seek(BaseModel):
    position: float
    track_id: UUID | None
