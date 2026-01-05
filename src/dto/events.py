from uuid import UUID
from datetime import datetime

from pydantic import BaseModel
from fastapi_events.registry.payload_schema import registry as payload_schema

from _types import Source, Status


@payload_schema.register("order_created")
class OrderCreated(BaseModel):
    order_id: UUID
    owner_id: UUID
    requester_nickname: str
    playlist_name: str
    yt_video_id: str
    donation_currency_amount: float = 0.0
    priority: str
    title: str
    duration: int
    views: int
    likes: int
    source: Source
    created_at: datetime


@payload_schema.register("order_updated")
class OrderUpdate(BaseModel):
    order_id: UUID
    owner_id: UUID
    requester_nickname: str
    playlist_name: str
    status: Status
    priority: str
    details: str


@payload_schema.register("track_added")
class PlaylistTrackAdded(BaseModel):
    id: str
    playlist_id: str
    yt_video_id: str
    priority: str
    title: str
    duration: int
    requester_nickname: str
    created_at: datetime
    source: Source
