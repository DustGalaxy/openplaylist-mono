from datetime import datetime
from typing import Callable
from urllib import parse
import functools
import json
from uuid import UUID, uuid4

from pydantic import BaseModel
from taskiq.kicker import AsyncKicker

from src.dal._redis.broker import get_broker, RedisAdapter
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
    return int(datetime.fromisoformat(s).timestamp())

def extract_youtube_video_id(url: str) -> str | None:
    """
    Examples:
    - http://youtu.be/SA2iWivDJiE
    - http://www.youtube.com/watch?v=_oPAwA_Udwc&feature=feedu
    - http://www.youtube.com/embed/SA2iWivDJiE
    - http://www.youtube.com/v/SA2iWivDJiE?version=3&amp;hl=en_US
    - https://music.youtube.com/watch?v=SA2iWivDJiE
    """
    query = parse.urlparse(url)
    if query.hostname == "youtu.be":
        return query.path[1:]
    if query.hostname in ("www.youtube.com", "youtube.com", "m.youtube.com", "music.youtube.com"):
        if query.path == "/watch":
            p = parse.parse_qs(query.query)
            return p["v"][0]
        if query.path[:7] == "/embed/":
            return query.path.split("/")[2]
        if query.path[:3] == "/v/":
            return query.path.split("/")[2]
    return None


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
