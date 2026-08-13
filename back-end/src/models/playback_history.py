from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PlaybackHistorySchema(BaseModel):
    id: UUID
    user_id: UUID
    order_id: UUID
    playlist_id: UUID
    played_at: datetime
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PlaybackHistoryCreate(BaseModel):
    user_id: UUID
    order_id: UUID
    playlist_id: UUID


class PlaybackHistoryItemResponse(BaseModel):
    id: UUID
    order_id: UUID
    playlist_id: UUID
    playlist_name: str
    title: str
    yt_video_id: str
    duration: int
    views: int
    likes: int
    requester_nickname: str
    source: str
    played_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlaybackHistoryListResponse(BaseModel):
    items: list[PlaybackHistoryItemResponse]
    total: int
    limit: int
    offset: int
