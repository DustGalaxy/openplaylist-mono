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
    yt_video_url: str
    priority: str
