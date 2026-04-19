from enum import Enum
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession


class Platform(Enum):
    TWITCH = "twitch"
    DA = "donationalerts"
    YOUTUBE = "youtube"
    GOOGLE = "google"
    WEB = "web"
    GENERAL = "__general__"


class ChatPlatform(Enum):
    TWITCH = "twitch"
    YOUTUBE = "youtube"
    WEB = "web"


class DonationPlatform(Enum):
    GENERAL = "__general__"
    DA = "donationalerts"


Status = Literal["in playlist", "removed", "listened", "skipped", "reported"]
DeleteStatus = Literal["removed", "listened", "skipped", "reported"]
Source = Literal["twitch", "youtube", "web", "da"]
