from pydantic import BaseModel
from enum import StrEnum
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession


class NotificationType(StrEnum):
    """Типы уведомлений для контроля валидности на уровне приложения."""

    SYSTEM = "system"
    LIKE = "like"
    NEW_FOLLOWER = "new_follower"


class PlaylistLogsEventTypes(StrEnum):
    ADD_TRACK = "add_track"
    ADD_TRACK_ERROR = "add_track_error"

    PLAY_TRACK = "play_track"

    REMOVE_TRACK = "remove_track"
    LISTEN_TRACK = "listen_track"
    SKIP_TRACK = "skip_track"
    REPORT_TRACK = "report_track"

    ERROR = "error"


# базовые платформы — единый источник строковых значений
class Platform(StrEnum):
    TWITCH = "twitch"
    YOUTUBE = "youtube"
    GOOGLE = "google"
    DA = "donationalerts"
    WEB = "web"
    DONATEX = "donatex"


# служебный sentinel — только для БД, не платформа
GENERAL_SCOPE = "__general__"


# --- каждая таблица получает свой явный scope ---


class ContentSettingScope(StrEnum):
    TWITCH = Platform.TWITCH
    YOUTUBE = Platform.YOUTUBE
    WEB = Platform.WEB
    DA = Platform.DA
    DONATEX = Platform.DONATEX
    GENERAL = GENERAL_SCOPE


class BlockListScope(StrEnum):
    TWITCH = Platform.TWITCH
    YOUTUBE = Platform.YOUTUBE
    DA = Platform.DA
    WEB = Platform.WEB
    DONATEX = Platform.DONATEX


class DonationRuleScope(StrEnum):
    DA = Platform.DA
    DONATEX = Platform.DONATEX
    GENERAL = GENERAL_SCOPE


class ChatRuleScope(StrEnum):
    TWITCH = Platform.TWITCH
    YOUTUBE = Platform.YOUTUBE


# --- интеграции — отдельный контекст ---


class IntegrationPlatform(StrEnum):
    TWITCH = Platform.TWITCH
    YOUTUBE = Platform.YOUTUBE
    GOOGLE = Platform.GOOGLE
    DA = Platform.DA
    DONATEX = Platform.DONATEX


class IntegrationType(StrEnum):
    IDENTITY_ONLY = "identity_only"
    BOT_ONLY = "bot_only"
    IDENTITY_AND_BOT = "identity_and_bot"


class AuthFlow(StrEnum):
    AUTH_CODE = "oauth2_code"
    PKCE = "oauth2_pkce"
    USER_KEY = "user_key"


# --- источник трека ---


class PlaylistMode(StrEnum):
    FLOW = "flow"
    STATIC = "static"
    STREAM = "stream"


class SortSettings(BaseModel):
    date: Literal["asc", "desc", "none"]
    priority: Literal["asc", "desc", "none"]
    shuffle: Literal["asc", "desc", "none"]


class TrackSource(StrEnum):
    TWITCH = Platform.TWITCH
    YOUTUBE = Platform.YOUTUBE
    WEB = Platform.WEB
    DA = Platform.DA
    DONATEX = Platform.DONATEX


class PlatformCap(StrEnum):
    CHAT = "chat"  # чат
    DONATIONS = "donations"  # пожертвования


Status = Literal["in playlist", "removed", "listened", "skipped", "reported"]
DeleteStatus = Literal["removed", "listened", "skipped", "reported"]
Source = Literal["twitch", "youtube", "web", "da"]
