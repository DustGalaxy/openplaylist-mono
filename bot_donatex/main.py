from contextlib import asynccontextmanager
import logging

from faststream import FastStream

from src.adapters._rabbit.bots import rabbit_broker as broker
from src.services.manager import SignalRManager
from src.app_context import context


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
