from taskiq import TaskiqMiddleware, TaskiqScheduler
from taskiq.schedule_sources import LabelScheduleSource
from taskiq_redis import RedisAsyncResultBackend, ListQueueBroker

from src.settings import settings
from src.adapters._rabbit import broker as rabbit_broker
from src.adapters._sio.init import sio
from src.dal._redis.broker import get_broker
from src.models import model_rebuild

model_rebuild()

result_backend = RedisAsyncResultBackend(redis_url=settings.REDIS_URL + "/2")

task_broker = ListQueueBroker(
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


task_broker.add_middlewares(MyMiddleware())

scheduler = TaskiqScheduler(
    broker=task_broker,
    sources=[LabelScheduleSource(task_broker)],
)
