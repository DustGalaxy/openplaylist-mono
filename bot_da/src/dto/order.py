from typing import Literal
from uuid import UUID
from pydantic import BaseModel

Source = Literal["twitch", "youtube", "web", "da"]


class OrderNew(BaseModel):
    request_id: UUID
    owner_id: UUID
    requester_id: int
    requester_nickname: str
    donation_currency_amount: float = 0.0
    playlist_name: str
    yt_video_id: str
    priority: str
    source: Source
