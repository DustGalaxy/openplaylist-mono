from typing import Literal
from uuid import UUID

from pydantic import BaseModel

Status = Literal["processing", "completed", "cancelled"]
Source = Literal["twitch", "youtube", "web"]


class OrderUpdate(BaseModel):
    order_id: UUID
    owner_id: UUID
    owner_platform_id: str
    requester_nickname: str
    playlist_name: str
    status: Status
    details: str


class NewOrderPayload(BaseModel):
    broadcaster_id: int
    chatter_id: int
    chatter_nickname: str
    yt_video_url: str
    priority: str


class OrderNew(BaseModel):
    request_id: UUID
    owner_platform_id: str
    owner_id: UUID
    requester_id: int
    requester_nickname: str
    yt_video_url: str
    priority: str
