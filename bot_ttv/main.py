import asyncio
from contextlib import asynccontextmanager
import logging


from faststream import FastStream
import twitchio

from src.log_setup import LOGGER
from src.adapters._rabbit.handlers import broker
from src.adapters._redis.broker import redis_adapter
from src.bot_setup import setup_bot, context


@asynccontextmanager
async def lifespan(_app: FastStream):
    twitchio.utils.setup_logging(level=logging.INFO)
    await broker.start()
    LOGGER.info("RabbitMQ adapter connected.")

    redis_adapter.connect()
    LOGGER.info("Redis adapter connected.")
    asyncio.create_task(async_setup_wrapper())
    LOGGER.info("FastStream application starting up...")

    yield
    await broker.stop()

    redis_adapter.close()
    LOGGER.info("FastStream application shutting down...")

    if bot := context.get("bot"):
        await bot.close() # type: ignore
        LOGGER.info("TwitchIO bot disconnected.")


app = FastStream(broker, lifespan=lifespan)


async def async_setup_wrapper():
    bot = await setup_bot()
    await bot.start(load_tokens=False, save_tokens=False)
    LOGGER.info("TwitchIO bot task scheduled.")
