import functools
import json
from collections.abc import Callable
from datetime import datetime
from urllib import parse
from uuid import UUID, uuid4

import isodate
from pydantic import BaseModel
from taskiq.kicker import AsyncKicker

from src._types import EVENTS_MAP, PlaylistTypes, TargetType, UserTypes
from src.dal._redis.broker import RedisAdapter, get_broker
from src.settings import settings


def find[T](list_to_search: list[T], condition_func: Callable[[T], bool]) -> T | None:
    return next((item for item in list_to_search if condition_func(item)), None)


def find_all[T](list_to_search: list[T], condition_func: Callable[[T], bool]) -> list[T]:
    return [item for item in list_to_search if condition_func(item)]


async def kick(task_name: str, broker, *args, labels=None, **kwargs):
    if labels is None:
        labels = {}
    kicker = AsyncKicker(task_name, broker, labels=labels)
    return await kicker.kiq(*args, **kwargs)


def parse_ISO_8601(s: str) -> int:
    return int(isodate.parse_duration(s).total_seconds())


from src.dto.youtube import ParsedYouTubeUrl, YouTubePlaylistType, YouTubeUrlType


def classify_youtube_playlist_id(playlist_id: str) -> YouTubePlaylistType:
    playlist_id_upper = playlist_id.upper()
    if (
        playlist_id_upper.startswith("RD")
        or playlist_id_upper.startswith("UL")
        or playlist_id_upper.startswith("TL")
        or playlist_id_upper.startswith("LL")
    ):
        return YouTubePlaylistType.AUTOMATIC_MIX
    return YouTubePlaylistType.USER_CUSTOM


def parse_youtube_url(url: str) -> ParsedYouTubeUrl | None:
    if not url:
        return None
    query = parse.urlparse(url.strip())
    hostname = query.hostname.lower() if query.hostname else ""
    params = parse.parse_qs(query.query)

    video_id: str | None = None
    playlist_id: str | None = None

    if hostname == "youtu.be":
        path = query.path.lstrip("/")
        if path:
            video_id = path.split("/")[0]
        if "list" in params and params["list"]:
            playlist_id = params["list"][0]

    elif hostname in ("www.youtube.com", "youtube.com", "m.youtube.com", "music.youtube.com"):
        if query.path in ("/watch", "/watch/"):
            if "v" in params and params["v"]:
                video_id = params["v"][0]
            if "list" in params and params["list"]:
                playlist_id = params["list"][0]
        elif query.path in ("/playlist", "/playlist/"):
            if "list" in params and params["list"]:
                playlist_id = params["list"][0]
        elif query.path.startswith("/embed/"):
            parts = [p for p in query.path.split("/") if p]
            if len(parts) >= 2:
                video_id = parts[1]
            if "list" in params and params["list"]:
                playlist_id = params["list"][0]
        elif query.path.startswith("/v/"):
            parts = [p for p in query.path.split("/") if p]
            if len(parts) >= 2:
                video_id = parts[1]
            if "list" in params and params["list"]:
                playlist_id = params["list"][0]

    if not video_id and not playlist_id:
        return None

    playlist_type = classify_youtube_playlist_id(playlist_id) if playlist_id else None

    if video_id and playlist_id:
        url_type = YouTubeUrlType.VIDEO_IN_PLAYLIST
    elif playlist_id:
        url_type = YouTubeUrlType.PLAYLIST
    else:
        url_type = YouTubeUrlType.VIDEO

    return ParsedYouTubeUrl(
        url_type=url_type,
        video_id=video_id,
        playlist_id=playlist_id,
        playlist_type=playlist_type,
    )


def extract_youtube_video_id(url: str) -> str | None:
    parsed = parse_youtube_url(url)
    return parsed.video_id if parsed else None



def prepare_obj(obj):
    if isinstance(obj, BaseModel):
        return obj.model_dump()
    if isinstance(obj, (list, tuple, set)):
        return [prepare_obj(i) for i in obj]
    if isinstance(obj, (UUID, datetime)):
        return str(obj)
    if isinstance(obj, dict):
        return {k: prepare_obj(v) for k, v in obj.items()}
    return obj


def obj_to_json(obj) -> str:
    return json.dumps(
        prepare_obj(obj),
        ensure_ascii=False,
        default=lambda x: str(x) if isinstance(x, UUID) else x,
    )


def trace_to_redis(redis_client: RedisAdapter, key_prefix: str):
    """
    Декоратор для отслеживания результатов выполнения функций в Redis.

    Используется только в тестовом окружении.
    """

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            trace_id = uuid4().hex[:8]
            key = f"trace:{key_prefix}:{func.__name__}:{trace_id}"
            try:
                await redis_client.set(key, obj_to_json(result), ex=180)
            except Exception as e:
                print(f"Tracing failed for {func.__name__}: {e}")

            return result

        return wrapper

    return decorator


def conditional_trace(key_prefix: str):
    def decorator(func: Callable):
        if settings.IS_TESTING == "true":
            return trace_to_redis(get_broker(), key_prefix)(func)
        return func

    return decorator


def get_event_payload_type(target_type: TargetType, event_type: str) -> UserTypes | PlaylistTypes:
    return EVENTS_MAP[target_type][event_type]
