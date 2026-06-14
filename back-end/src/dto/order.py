from uuid import UUID

from pydantic import BaseModel

from src._types import Status, TrackSource


class DonatexNewOrder(BaseModel):
    request_id: UUID
    owner_platform_id: str
    owner_id: UUID
    requester_id: str
    requester_nickname: str
    donation_amount: float = 0.0
    donation_currency: str
    yt_video_url: str
    priority: str = "donation"
    source: TrackSource = TrackSource.DONATEX

class DANewOrder(BaseModel):
    request_id: UUID
    owner_platform_id: str
    owner_id: UUID
    requester_id: str
    requester_nickname: str
    donation_amount: float = 0.0
    donation_currency: str
    yt_video_url: str
    priority: str = "donation"
    source: TrackSource = TrackSource.DA


class TTVNewOrder(BaseModel):
    request_id: UUID
    owner_platform_id: str
    owner_id: UUID
    requester_id: str
    requester_nickname: str
    yt_video_url: str
    priority: str
    source: TrackSource = TrackSource.TWITCH


class WebNewOrder(BaseModel):
    request_id: UUID
    owner_id: UUID
    owner_platform_id: str
    requester_id: str
    requester_nickname: str
    playlist_id: str
    yt_video_url: str
    priority: str
    source: TrackSource = TrackSource.WEB


class YTNewOrder(BaseModel):
    request_id: UUID
    owner_platform_id: str
    owner_id: UUID
    requester_id: str
    requester_nickname: str
    yt_video_url: str
    priority: str
    source: TrackSource = TrackSource.YOUTUBE


class OrderNew(BaseModel):
    request_id: UUID
    owner_id: UUID
    owner_platform_id: str
    requester_id: str
    requester_nickname: str
    donation_currency_amount: float = 0.0
    yt_video_id: str
    priority: str
    source: TrackSource


class OrderUpdate(BaseModel):
    order_id: UUID
    owner_id: UUID
    requester_nickname: str
    status: Status
    priority: str
    details: str


class HTTPOrderNew(BaseModel):
    request_id: UUID
    requester_id: int
    requester_nickname: str
    playlist_id: str
    yt_video_id: str
    source: TrackSource
