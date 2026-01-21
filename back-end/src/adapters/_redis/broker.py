from typing import Any
from redis import Redis
from redis.typing import ExpiryT, AbsExpiryT, ResponseT, EncodableT

from settings import settings
import functools


def ready_check(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        instance: RedisAdapter = args[0]
        if not instance.ready:
            raise RuntimeError("RedisAdapter is not ready")
        return func(*args, **kwargs)

    return wrapper


class RedisAdapter:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.ready = False
        self.broker: Redis

    def close(self) -> None:
        self.broker.close()
        self.ready = False

    def connect(self) -> None:
        self.broker = Redis.from_url(self.redis_url)
        self.ready = True

    @ready_check
    def set(
        self,
        name: str,
        value: EncodableT,
        ex: ExpiryT | None = None,
        px: ExpiryT | None = None,
        nx: bool = False,
        xx: bool = False,
        keepttl: bool = False,
        get: bool = False,
        exat: AbsExpiryT | None = None,
        pxat: AbsExpiryT | None = None,
    ) -> ResponseT:
        return self.broker.set(
            name=name,
            value=value,
            ex=ex,
            px=px,
            nx=nx,
            xx=xx,
            keepttl=keepttl,
            get=get,
            exat=exat,
            pxat=pxat,
        )

    @ready_check
    def get(self, name: str) -> Any | None:
        return self.broker.get(name=name)

    @ready_check
    def delete(self, name: str | list[str]) -> None:
        if not isinstance(name, list):
            name = [name]
        self.broker.delete(*name)

    @ready_check
    def hset(
        self,
        name: str,
        key: str | None = None,
        value: str | None = None,
        mapping: dict | None = None,
        items: list | None = None,
    ) -> None:
        self.broker.hset(name=name, key=key, value=value, mapping=mapping, items=items)

    @ready_check
    def hdel(self, name: str, *keys: str) -> None:
        self.broker.hdel(name=name, *keys)

    @ready_check
    def hget(self, name: str, key: str) ->  str | None:
        return self.broker.hget(name=name, key=key)  # pyright: ignore[reportReturnType]

    @ready_check
    def hgetall(self, name: str) ->  dict | None:
        return self.broker.hgetall(name=name) # pyright: ignore[reportReturnType]

redis_adapter = RedisAdapter(settings.REDIS_URL)
