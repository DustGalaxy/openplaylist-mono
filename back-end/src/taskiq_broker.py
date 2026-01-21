from taskiq import TaskiqMiddleware
from taskiq_redis import RedisAsyncResultBackend, ListQueueBroker

from settings import settings
from adapters._rabbit.event_broker import broker as rabbit_broker
from adapters._redis.broker import redis_adapter

# 1. Настраиваем бэкенд для хранения результатов (чтобы знать, что задача выполнена)
result_backend = RedisAsyncResultBackend(redis_url=settings.REDIS_URL + "/2")

# 2. Настраиваем брокер (очередь сообщений)
broker = ListQueueBroker(
    url=settings.REDIS_URL + "/2",
).with_result_backend(result_backend)


class MyMiddleware(TaskiqMiddleware):
    async def startup(self) -> None:
        await rabbit_broker.start()
        redis_adapter.connect()

    async def shutdown(self) -> None:
        redis_adapter.close()
        await rabbit_broker.stop()


broker.add_middlewares(MyMiddleware())
