from typing import TYPE_CHECKING

from redis import Redis

from settings import settings


if TYPE_CHECKING:

    class RedisAdapter(Redis):  # pyright: ignore[reportRedeclaration]
        ready = False
        broker: Redis
        redis_url: str

        def close(self) -> None: ...
        def connect(self) -> None: ...
else:

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

        def __getattribute__(self, name: str):
            # Получаем атрибуты самого адаптера (connect, ready и т.д.)
            if name in ("broker", "ready", "redis_url", "connect", "close"):
                return super().__getattribute__(name)

            # Проверка готовности перед доступом к методам Redis
            if not super().__getattribute__("ready"):
                raise RuntimeError("RedisAdapter is not ready")

            return getattr(super().__getattribute__("broker"), name)


redis_adapter = RedisAdapter(settings.REDIS_URL)
