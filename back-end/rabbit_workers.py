from contextlib import asynccontextmanager

from faststream import ContextRepo, FastStream
from src.adapters._rabbit.broker import broker
from src.adapters._rabbit.worker.callback_handler import router as callback_router
from src.adapters._rabbit.worker.logs_handler import router as log_router
from src.adapters._rabbit.worker.notification_handler import router as notify_touter
from src.adapters._rabbit.worker.widget_handler import router as widget_router
from src.adapters._rabbit.worker.order_proccess_handler import router as order_router

from src.dal._redis.broker import get_broker

# Регистрируем общий роутер в брокере
broker.include_routers(
    callback_router,
    log_router,
    notify_touter,
    widget_router,
    order_router,
)


@asynccontextmanager
async def lifespan(context: ContextRepo):
    await broker.start()
    get_broker().connect()
    yield
    await broker.stop()
    get_broker().close()


# Инициализируем FastStream приложение
app = FastStream(broker, lifespan=lifespan)
