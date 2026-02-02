from uuid import UUID

from pydantic import BaseModel

from _types import Status, Source


class DANewOrder(BaseModel):
    request_id: UUID
    owner_id: UUID
    requester_id: int
    requester_nickname: str
    donation_currency_amount: float = 0.0
    yt_video_url: str
    priority: str = "d"
    source: Source = "da"


class TTVNewOrder(BaseModel):
    request_id: UUID
    owner_id: UUID
    requester_id: int
    requester_nickname: str
    yt_video_url: str
    priority: str
    source: Source = "twitch"


class WebNewOrder(BaseModel):
    request_id: UUID
    owner_id: UUID
    requester_nickname: str
    playlist_id: str
    yt_video_url: str
    priority: str
    source: Source = "web"


class YTNewOrder(BaseModel):
    request_id: UUID
    owner_id: UUID
    requester_nickname: str
    yt_video_url: str
    priority: str
    source: Source = "youtube"


class OrderNew(BaseModel):
    request_id: UUID
    owner_id: UUID
    requester_nickname: str
    donation_currency_amount: float = 0.0
    yt_video_id: str
    priority: str
    source: Source


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
    source: Source
