from typing import TYPE_CHECKING, Any

from redis import Redis

from src.settings import settings

if TYPE_CHECKING:

    class RedisAdapter(Redis):  # pyright: ignore[reportRedeclaration]
        ready = False
        broker: Redis
        redis_url: str

        def close(self) -> None: ...
        def connect(self) -> None: ...
else:

    class RedisAdapter:
        def __init__(self, redis_url: str, **kwargs: Any):
            self.redis_url = redis_url
            self.kwargs = kwargs
            self.ready = False
            self.broker: Redis | None = None

        def connect(self) -> None:
            self.broker = Redis.from_url(self.redis_url, **self.kwargs)
            self.ready = True

        def close(self) -> None:
            if self.broker:
                self.broker.close()
            self.ready = False

        def __getattr__(self, name: str):
            # Если мы здесь, значит запрашиваемого метода нет в RedisAdapter.
            # Проверяем готовность и пробрасываем запрос в self.broker.
            if not self.ready:
                raise RuntimeError("RedisAdapter is not ready")

            return getattr(self.broker, name)


_broker = None


def get_broker() -> RedisAdapter:
    global _broker
    if _broker is None:
        _broker = RedisAdapter(settings.REDIS_URL + "/0", decode_responses=True)
    return _broker
