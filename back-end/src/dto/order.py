from uuid import UUID

from pydantic import BaseModel

from _types import Status, Platform


class DANewOrder(BaseModel):
    request_id: UUID
    owner_id: UUID
    requester_id: int
    requester_nickname: str
    donation_currency_amount: float = 0.0
    yt_video_url: str
    priority: str = "d"
    source: Platform = Platform.DA


class TTVNewOrder(BaseModel):
    request_id: UUID
    owner_id: UUID
    requester_id: int
    requester_nickname: str
    yt_video_url: str
    priority: str
    source: Platform = Platform.TWITCH


class WebNewOrder(BaseModel):
    request_id: UUID
    owner_id: UUID
    requester_nickname: str
    playlist_id: str
    yt_video_url: str
    priority: str
    source: Platform = Platform.WEB


class YTNewOrder(BaseModel):
    request_id: UUID
    owner_id: UUID
    requester_nickname: str
    yt_video_url: str
    priority: str
    source: Platform = Platform.YOUTUBE




class OrderNew(BaseModel):
    request_id: UUID
    owner_id: UUID
    requester_nickname: str
    donation_currency_amount: float = 0.0
    yt_video_id: str
    priority: str
    source: Platform


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
    source: Platform
