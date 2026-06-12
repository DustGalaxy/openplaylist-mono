from typing import Literal
from uuid import UUID
from pydantic import BaseModel

Source = Literal["twitch", "youtube", "web", "donationalerts"]


class OrderNew(BaseModel):
    request_id: UUID
    owner_platform_id: str
    owner_id: UUID
    requester_id: str
    requester_nickname: str
    donation_amount: float = 0.0
    donation_currency: str
    yt_video_url: str
    priority: str
