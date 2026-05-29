from enum import StrEnum
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession


class PlaylistLogsEventTypes(StrEnum):
    ADD_TRACK = "add_track"

    PLAY_TRACK = "play_track"

    REMOVE_TRACK = "remove_track"
    LISTEN_TRACK = "listen_track"
    SKIP_TRACK = "skip_track"
    REPORT_TRACK = "report_track"

    ERROR = "error"


class _All_Platforms(StrEnum):
    TWITCH = "twitch"
    YOUTUBE = "youtube"
    GOOGLE = "google"
    WEB = "web"
    DA = "donationalerts"
    GENERAL = "__general__"


class Platform(StrEnum):
    TWITCH = _All_Platforms.TWITCH
    DA = _All_Platforms.DA
    YOUTUBE = _All_Platforms.YOUTUBE
    GOOGLE = _All_Platforms.GOOGLE
    WEB = _All_Platforms.WEB


class ChatPlatform(StrEnum):
    TWITCH = _All_Platforms.TWITCH
    YOUTUBE = _All_Platforms.YOUTUBE


class DonationPlatform(StrEnum):
    DA = _All_Platforms.DA


class DB_DonationPlatform(StrEnum):
    GENERAL = _All_Platforms.GENERAL
    DA = _All_Platforms.DA


Status = Literal["in playlist", "removed", "listened", "skipped", "reported"]
DeleteStatus = Literal["removed", "listened", "skipped", "reported"]
Source = Literal["twitch", "youtube", "web", "da"]
