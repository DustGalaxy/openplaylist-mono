from enum import Enum
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession


class Platform(Enum):
    TWITCH = "twitch"
    DA = "da"
    GOOGLE = "google"



Status = Literal["in playlist", "removed", "listened", "skipped", "reported"]
DeleteStatus = Literal["removed", "listened", "skipped", "reported"]
Source = Literal["twitch", "youtube", "web", "da"]
