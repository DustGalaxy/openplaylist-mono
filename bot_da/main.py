import logging
from contextlib import asynccontextmanager

from faststream import FastStream
from src.adapters._rabbit.broker import rabbit_broker as broker
from src.adapters._rabbit.handlers import router
from src.context import context
from src.services.manager import Manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("DonationAlertsBot")


@asynccontextmanager
async def lifespan():
    logger.info("Initializing DonationAlerts Bot service...")
    manager = Manager()
    context.manager = manager

    broker.include_routers(router)

    await broker.start()
    logger.info("RabbitMQ broker connected and command routers registered.")

    try:
        await manager.start()
        logger.info("Initial DonationAlerts connections successfully established.")
    except Exception as e:
        logger.error(
            f"Error during initial listener setup: {e}. Bot will continue running and listen for incoming connection commands.",
            exc_info=True,
        )

    yield

    logger.info("Shutting down DonationAlerts Bot service...")
    await manager.stop()
    await broker.stop()
    logger.info("DonationAlerts Bot shutdown complete.")


app = FastStream(broker, lifespan=lifespan)
