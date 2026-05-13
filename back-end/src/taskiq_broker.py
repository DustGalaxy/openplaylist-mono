from taskiq import TaskiqMiddleware, TaskiqScheduler
from taskiq.schedule_sources import LabelScheduleSource
from taskiq_redis import RedisAsyncResultBackend, ListQueueBroker

from settings import settings
from adapters._rabbit.event_broker import broker as rabbit_broker
from adapters._redis.broker import get_broker
from adapters._sio.init import sio

result_backend = RedisAsyncResultBackend(redis_url=settings.REDIS_URL + "/2")

broker = ListQueueBroker(
    url=settings.REDIS_URL + "/2",
).with_result_backend(result_backend)


class MyMiddleware(TaskiqMiddleware):
    async def startup(self) -> None:
        await rabbit_broker.start()
        get_broker().connect()
        sio.manager.initialize()

    async def shutdown(self) -> None:
        get_broker().close()
        await rabbit_broker.stop()


broker.add_middlewares(MyMiddleware())

scheduler = TaskiqScheduler(
    broker=broker,
    sources=[LabelScheduleSource(broker)],
)
