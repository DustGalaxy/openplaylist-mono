import asyncio
from contextlib import asynccontextmanager
import logging


from faststream import FastStream
import twitchio

from src.log_setup import LOGGER
from src.adapters._rabbit.handlers import broker
from src.adapters._redis.broker import redis_adapter
from src.bot_setup import setup_bot


@asynccontextmanager
async def lifespan(_app: FastStream):
    twitchio.utils.setup_logging(level=logging.INFO)
    await broker.start()

    redis_adapter.connect()

    bot = await setup_bot()
    LOGGER.info("FastStream application starting up...")

    asyncio.create_task(bot.start(load_tokens=False))
    LOGGER.info("TwitchIO bot task scheduled.")
    yield
    await broker.stop()

    redis_adapter.close()
    LOGGER.info("FastStream application shutting down...")

    if bot:
        await bot.close()
        LOGGER.info("TwitchIO bot disconnected.")


app = FastStream(broker, lifespan=lifespan)
