from enum import StrEnum
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel

from src._types import TrackSource, OrderStatus
from src.models.order import OrderDomain


class OrderCreated(BaseModel):
    order_id: UUID
    owner_id: UUID
    is_owner: bool
    requester_nickname: str
    yt_video_id: str
    donation_currency_amount: float = 0.0
    priority: str
    title: str
    duration: int
    views: int
    likes: int
    source: TrackSource
    created_at: datetime


class OrderUpdate(BaseModel):
    order_id: UUID
    owner_id: UUID
    owner_platform_id: str | None = None
    requester_nickname: str
    playlist_name: str | None = None
    status: OrderStatus
    priority: str
    details: str
    reward_id: str | None = None
    redemption_id: str | None = None


class PlaylistTrackAdded(BaseModel):
    id: str
    playlist_id: str
    yt_video_id: str
    priority: str
    title: str
    duration: int
    requester_nickname: str
    created_at: datetime
    source: TrackSource


class PlayNow(BaseModel):
    track_id: str | None
    playlist_id: str


class Deleted(BaseModel):
    track_id: str
    playlist_id: str


class Moved(BaseModel):
    track_id: str

    playlist_id: str


class Private(BaseModel):
    owner_id: str
    playlist_id: str


class Public(BaseModel):
    owner_id: str
    playlist_id: str
