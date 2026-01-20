from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI

# from fastapi.staticfiles import StaticFiles # Keep if you add static files later
from starlette.middleware.sessions import SessionMiddleware

# Import the new config loader
import config as app_config  # Use the loaded settings directly

# Import other modules
from database import create_db, drop_db
from services.manager import Manager
from adapters._rabbit.handlers import rabbit_broker
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
    await drop_db()
    await create_db()

    # Start listener on startup
    logger.info("Application startup...")
    manager: Manager = Manager()
    context.manager = manager  # pyright: ignore[reportArgumentType]

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

# Session Middleware (for OAuth state)
# Use the key loaded by config.py
app.add_middleware(
    SessionMiddleware, secret_key=settings.SESSION_SECRET_KEY, https_only=False
)  # Set https_only=True in production


# @app.get("/api/auth/donationalerts/login")
# async def login_donationalerts(request: Request):
#     """Initiates the OAuth2 flow by redirecting the user to DonationAlerts."""
#     # Call the function which now uses config.settings
#     authorization_url, state = get_authorization_url()
#     request.session["oauth_state"] = state  # Store state in session
#     logger.info(f"Redirecting user to DonationAlerts for authorization. State: {state}")
#     return RedirectResponse(authorization_url)


# @app.get("/api/auth/donationalerts/callback")
# async def auth_donationalerts_callback(request: Request, code: str = None, state: str = None, error: str = None):  # type: ignore
#     """Handles the callback from DonationAlerts after user authorization."""

#     logger.info("OAuth state verified. Exchanging code for token...")
#     # Call the function which now uses config.settings
#     token_data = await exchange_code_for_token(code)

#     if token_data:
#         logger.info("Token received successfully. Starting listener...")
#         # Ensure listener is started/restarted with new token
#         await manager[0].stop()  # Stop if running
#         await asyncio.sleep(0.1)  # Short pause
#         # Pass necessary config if needed, or rely on it using config.settings
#         await manager[0].start()
#         return RedirectResponse(url="/?status=success", status_code=303)  # Redirect to homepage
#     else:
#         logger.error("Failed to exchange code for token.")


# @app.post("/api/auth/donationalerts/logout")
# async def logout_donationalerts():
#     """Clears the stored token and stops the listener."""
#     logger.info("Logging out user, clearing token and stopping listener.")
#     await manager[0].stop()
#     token_storage.clear_token()
#     return {"message": "Logged out successfully"}


# @app.get("/api/status")
# async def get_status():
#     """Checks if the backend has a potentially valid token."""
#     token_data = token_storage.load_token()
#     is_authenticated = bool(
#         token_data and (token_storage.is_token_valid(token_data) or token_storage.needs_refresh(token_data))
#     )
#     listener_running = manager[0]._is_running
#     listener_connected = manager[0]._ws is not None and manager[0]._ws.state == WebSocketState.CONNECTED
#     return {
#         "authenticated": is_authenticated,
#         "listener_running": listener_running,
#         "listener_connected": listener_connected,
#     }


# --- Uvicorn Runner (for local development) ---
if __name__ == "__main__":
    # The config check/creation now happens when config.py is imported/loaded
    # So by the time we get here, .env should exist.
    import uvicorn

    logger.info("Starting Uvicorn server...")
    # Use reload=False if you encounter issues with background tasks or config reloading
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
