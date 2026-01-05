from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from _types import Status, Source


class OrderDomain(BaseModel):
    id: UUID
    owner_id: UUID

    requester_nickname: str
    playlist_name: str

    donation_currency_amount: float

    yt_video_id: str
    priority: str
    title: str
    duration: int

    views: int
    likes: int

    request_id: UUID

    source: Source
    status: Status

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderPatch(BaseModel):
    status: Status | None = None


class OrderCreate(BaseModel):
    owner_id: UUID

    requester_nickname: str
    playlist_name: str

    donation_currency_amount: float

    yt_video_id: str
    priority: str
    title: str
    duration: int

    views: int
    likes: int

    request_id: UUID

    source: Source
    status: Status = "processing"
