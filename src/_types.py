from enum import Enum
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession


class Platform(Enum):
    TWITCH = "twitch"
    DA = "da"
    GOOGLE = "google"


Status = Literal["processing", "completed", "cancelled"]
Source = Literal["twitch", "youtube", "web", "da"]
