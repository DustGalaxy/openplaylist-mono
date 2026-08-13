from pydantic import BaseModel
from enum import StrEnum
from typing import Literal, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession

# ==========================================
# 1. ТИПЫ ИЗМЕНЕНИЙ (EVENT TYPES) AS ENUMS
# ==========================================


class PlaylistEventType(StrEnum):
    TRACK_ADDED = "track.added"
    TRACK_REMOVED = "track.removed"
    BASIC_NAME = "basic.name"
    BASIC_VISIBILITY = "basic.visibility"
    REALTIME_SYNC = "realtime.sync"
    RULES_MODE = "rules.mode"
    RULES_VALIDATION = "rules.validation"
    RULES_PRIORITIES = "rules.priorities"


class UserEventType(StrEnum):
    PLAYLIST_CREATE = "playlist.create"
    PLAYLIST_DELETE = "playlist.delete"


# ==========================================
# 2. СТРУКТУРЫ ДАННЫХ (PAYLOADS) AS TYPEDDICTS
# ==========================================


class PlaylistBasePayload(BaseModel):
    playlist_name: str
    owner_name: str


# Специфичные payload для каждого ивента плейлиста
class TrackAddedPayload(PlaylistBasePayload):
    counter: int


class TrackRemovedPayload(PlaylistBasePayload):
    counter: int


class BasicNamePayload(PlaylistBasePayload):
    before: str
    after: str


class BasicVisibilityPayload(PlaylistBasePayload):
    before: bool
    after: bool


# class RealtimeSyncPayload(PlaylistBasePayload):
#     before: bool
#     after: bool


# class RulesModePayload(PlaylistBasePayload):
#     mode: str


# class RulesValidationPayload(PlaylistBasePayload):
#     counter: int


# class RulesPrioritiesPayload(PlaylistBasePayload):
#     counter: int


class UserBasePayload(BaseModel):
    username: str


class UserPlaylistCreatePayload(UserBasePayload):
    playlist_name: str


class UserPlaylistDeletePayload(UserBasePayload):
    playlist_name: str


# ==========================================
# 3. ОБЪЕДИНЯЮЩИЕ МАТРИЦЫ СОВМЕСТИМОСТИ
# ==========================================

# Ограничение по строкам для target_type
TargetType = Literal["playlist", "user"]

UserTypes = UserPlaylistCreatePayload | UserPlaylistDeletePayload
PlaylistTypes = (
    TrackAddedPayload | TrackRemovedPayload | BasicNamePayload | BasicVisibilityPayload
    # | RealtimeSyncPayload
    # | RulesModePayload
    # | RulesValidationPayload
    # | RulesPrioritiesPayload
)

EVENTS_MAP = {
    "playlist": {
        PlaylistEventType.TRACK_ADDED: TrackAddedPayload,
        PlaylistEventType.TRACK_REMOVED: TrackRemovedPayload,
        PlaylistEventType.BASIC_NAME: BasicNamePayload,
        PlaylistEventType.BASIC_VISIBILITY: BasicVisibilityPayload,
        # PlaylistEventType.REALTIME_SYNC: RealtimeSyncPayload,
        # PlaylistEventType.RULES_MODE: RulesModePayload,
        # PlaylistEventType.RULES_VALIDATION: RulesValidationPayload,
        # PlaylistEventType.RULES_PRIORITIES: RulesPrioritiesPayload,
    },
    "user": {
        UserEventType.PLAYLIST_CREATE: UserPlaylistCreatePayload,
        UserEventType.PLAYLIST_DELETE: UserPlaylistDeletePayload,
    },
}

# Матрицы для валидаторов (какие ивенты доступны какому типу)
PLAYLIST_EVENTS_SET = set(PlaylistEventType)
USER_EVENTS_SET = set(UserEventType)

NOTIFICATION_EVENT_TYPES_MAP = {
    "playlist": PLAYLIST_EVENTS_SET,
    "user": USER_EVENTS_SET,
}


class NotificationType(StrEnum):
    """Типы уведомлений для контроля валидности на уровне приложения."""

    SYSTEM = "system"
    LIKE = "like"
    NEW_FOLLOWER = "new_follower"
    INTEGRATION_DIED = "integration_died"


class PlaylistLogsEventTypes(StrEnum):
    ADD_TRACK = "add_track"
    BULK_ADD_TRACK = "bulk_add_track"
    ADD_TRACK_ERROR = "add_track_error"

    PLAY_TRACK = "play_track"

    REMOVE_TRACK = "remove_track"
    BULK_REMOVE_TRACK = "bulk_remove_track"
    LISTEN_TRACK = "listen_track"
    SKIP_TRACK = "skip_track"
    REPORT_TRACK = "report_track"

    CLAIM_LINK = "claim_link"
    FAILED_CLAIM_LINK = "failed_claim_link"
    MODERATOR_LEAVE = "moderator_leave"
    CREATE_MODERATOR_TOKEN = "create_moderator_token"
    ADD_MODERATOR_DIRECT = "add_moderator_direct"
    REVOKE_MODERATOR = "revoke_moderator"

    ERROR = "error"


# базовые платформы — единый источник строковых значений
class Platform(StrEnum):
    TWITCH = "twitch"
    YOUTUBE = "youtube"
    GOOGLE = "google"
    DA = "donationalerts"
    WEB = "web"
    DONATEX = "donatex"
    DONATEPAY = "donatepay"


# служебный sentinel — только для БД, не платформа
GENERAL_SCOPE = "__general__"


# --- каждая таблица получает свой явный scope ---


class ContentSettingScope(StrEnum):
    TWITCH = Platform.TWITCH
    YOUTUBE = Platform.YOUTUBE
    WEB = Platform.WEB
    DA = Platform.DA
    DONATEX = Platform.DONATEX
    DONATEPAY = Platform.DONATEPAY
    GENERAL = GENERAL_SCOPE


class BlockListScope(StrEnum):
    TWITCH = Platform.TWITCH
    YOUTUBE = Platform.YOUTUBE
    DA = Platform.DA
    WEB = Platform.WEB
    DONATEX = Platform.DONATEX
    DONATEPAY = Platform.DONATEPAY


class DonationRuleScope(StrEnum):
    DA = Platform.DA
    DONATEX = Platform.DONATEX
    DONATEPAY = Platform.DONATEPAY
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
    DONATEPAY = Platform.DONATEPAY


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
    DONATEPAY = Platform.DONATEPAY


class PlatformCap(StrEnum):
    CHAT = "chat"  # чат
    DONATIONS = "donations"  # пожертвования


Status = Literal["in playlist", "removed", "listened", "skipped", "reported"]
DeleteStatus = Literal["removed", "listened", "skipped", "reported"]
Source = Literal["twitch", "youtube", "web", "da"]


