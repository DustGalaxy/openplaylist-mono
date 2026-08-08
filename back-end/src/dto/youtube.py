from enum import StrEnum
from typing import TypedDict
from pydantic import BaseModel


class YouTubeUrlType(StrEnum):
    VIDEO = "video"
    PLAYLIST = "playlist"
    VIDEO_IN_PLAYLIST = "video_in_playlist"


class YouTubePlaylistType(StrEnum):
    USER_CUSTOM = "user_custom"
    AUTOMATIC_MIX = "automatic_mix"


class ParsedYouTubeUrl(BaseModel):
    url_type: YouTubeUrlType
    video_id: str | None = None
    playlist_id: str | None = None
    playlist_type: YouTubePlaylistType | None = None


VideoInfo = TypedDict(
    "VideoInfo",
    {
        "title": str,
        "author": str,
        "embeddable": bool,
        "views": int,
        "likes": int,
        "length": int,
        "yt_video_id": str,
    },
)
