import logging
from contextlib import asynccontextmanager

from faststream import FastStream
from src.adapters._rabbit.broker import rabbit_broker as broker
from src.adapters._rabbit.handlers import router
from src.app_context import context
from src.services.manager import SignalRManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan():
    # Start listener on startup
    logger.info("Application startup...")
    manager: SignalRManager = SignalRManager()
    context.manager = manager  # pyright: ignore[reportArgumentType]

    broker.include_routers(router)

    await broker.start()
    try:
        await manager.start()
    except TimeoutError:
        await broker.stop()
    logger.info("Listeners started.")

    yield

    logger.info("Application shutdown...")

    await manager.stop()
    await broker.stop()

    logger.info("Listeners stopped.")


app = FastStream(broker, lifespan=lifespan)
