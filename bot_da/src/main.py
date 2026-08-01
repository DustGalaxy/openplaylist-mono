from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI

# Import the new config loader
import config as app_config  # Use the loaded settings directly

# Import other modules
from services.manager import Manager
from adapters._rabbit.handlers import router
from adapters._rabbit.broker import rabbit_broker
from adapters._redis.broker import redis_adapter
from context import context

# --- Basic Configuration ---
# Setup logging after config ensures .env potentially exists
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# --- FastAPI App Setup ---
# Use settings loaded in config.py
settings = app_config.settings  # Get the loaded config


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start listener on startup
    logger.info("Application startup...")
    manager: Manager = Manager()
    context.manager = manager  # pyright: ignore[reportArgumentType]

    rabbit_broker.include_routers(router)
    await rabbit_broker.start()

    await manager.start()
    redis_adapter.connect()

    logger.info("Listener started.")

    yield

    logger.info("Application shutdown...")

    redis_adapter.close()
    await manager.stop()
    await rabbit_broker.stop()

    logger.info("Listener stopped.")


app = FastAPI(lifespan=lifespan)

# --- Uvicorn Runner (for local development) ---
if __name__ == "__main__":
    # The config check/creation now happens when config.py is imported/loaded
    # So by the time we get here, .env should exist.
    import uvicorn

    logger.info("Starting Uvicorn server...")
    # Use reload=False if you encounter issues with background tasks or config reloading
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
