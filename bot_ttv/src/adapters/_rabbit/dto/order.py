from typing import Literal
from uuid import UUID

from pydantic import BaseModel

Status = Literal["processing", "completed", "cancelled"]
Source = Literal["twitch", "youtube", "web"]


class OrderUpdate(BaseModel):
    order_id: UUID
    owner_id: UUID
    owner_platform_id: str | None = None
    requester_nickname: str
    playlist_name: str | None = None
    status: Status
    details: str
    reward_id: str | None = None
    redemption_id: str | None = None


class NewOrderPayload(BaseModel):
    broadcaster_id: str
    chatter_id: str
    chatter_nickname: str
    yt_video_url: str
    priority: str
    reward_id: str | None = None
    redemption_id: str | None = None


class OrderNew(BaseModel):
    request_id: UUID
    owner_platform_id: str
    owner_id: UUID
    requester_id: str
    requester_nickname: str
    yt_video_url: str
    priority: str
    reward_id: str | None = None
    redemption_id: str | None = None

