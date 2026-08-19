import asyncio
import logging
import time
from contextlib import suppress
from urllib.error import HTTPError
from uuid import UUID

import aiohttp
from signalrcore.aio.aio_hub_connection_builder import AIOHubConnectionBuilder
from src._types import Handler, IDonateXListener
from src.adapters._rabbit.broker import (
    auth_user_donatex_tokens_refreshed,
    main_exchange,
    rabbit_broker,
    user_token_died,
)
from src.adapters._rabbit.dto import DonateXTokenRefreshed
from src.settings import settings

logger = logging.getLogger(__name__)


async def refresh_access_token(
    refresh_token: str,
    user_id: UUID,
    platform_user_id: str,
    session: aiohttp.ClientSession | None = None,
) -> dict | None:
    logger.info(f"Initiating OAuth token refresh for platform_user_id='{platform_user_id}' (user_id={user_id})...")
    should_close = False
    if session is None:
        session = aiohttp.ClientSession()
        should_close = True

    try:
        data = {
            "refresh_token": refresh_token,
            "client_id": settings.DONATEX_CLIENT_ID,
            "grant_type": "refresh_token",
            "client_secret": settings.DONATEX_CLIENT_SECRET,
        }
        async with session.post(settings.DONATEX_TOKEN_URL, data=data) as response:
            logger.info(f"DonateX token refresh HTTP response: {response.status} for platform_user_id='{platform_user_id}'")

            if response.status == 200:
                json_data = await response.json()
                dto_data = DonateXTokenRefreshed(
                    user_id=user_id,
                    platform_user_id=platform_user_id,
                    access_token=json_data["access_token"],
                    refresh_token=json_data["refresh_token"],
                    expires_at=json_data["expires_in"] + int(time.time()),
                )

                await rabbit_broker.publish(dto_data, auth_user_donatex_tokens_refreshed, main_exchange)
                logger.info(f"Successfully refreshed and published new OAuth tokens for platform_user_id='{platform_user_id}'")
                return json_data
            else:
                resp_text = await response.text()
                logger.warning(
                    f"Token refresh failed (status={response.status}) for platform_user_id='{platform_user_id}'. Body: {resp_text}"
                )
                await rabbit_broker.publish(
                    {
                        "refresh_token": refresh_token,
                        "platform_user_id": platform_user_id,
                    },
                    user_token_died,
                    exchange=main_exchange,
                )
                return None
    except aiohttp.ClientError as e:
        logger.error(f"Network error during DonateX token refresh for user {platform_user_id}: {e}")
        return None
    except Exception as e:
        logger.exception(f"Unexpected error during DonateX token refresh for user {platform_user_id}: {e}")
        return None
    finally:
        if should_close:
            await session.close()


BASE_CONNECTION_COOLDOWN_SEC: float = 0.5


class SignalRListener(IDonateXListener):
    def __init__(
        self,
        user_id: UUID,
        platform_user_id: str,
        access_token: str,
        refresh_token: str,
        expires_at: int,
        handler: Handler,
        bot_settings: dict = {},
    ):
        self.user_id = user_id
        self.platform_user_id = platform_user_id
        self._access_token = access_token
        self._refresh_token = refresh_token
        self.expires_at = expires_at
        self._handler = handler

        self._connection = None
        self._is_running = False
        self._connect_lock = asyncio.Lock()
        self._loop = None
        self.bot_settings = bot_settings

    async def start(self):
        async with self._connect_lock:
            if self._is_running:
                logger.info(f"[{self.platform_user_id}] SignalR Listener is already running.")
                return

            self._is_running = True
            self._loop = asyncio.get_running_loop()

            logger.info(f"[{self.platform_user_id}] Waiting {BASE_CONNECTION_COOLDOWN_SEC}s cooldown before connecting...")
            await asyncio.sleep(BASE_CONNECTION_COOLDOWN_SEC)

            await self._build_and_connect()

    async def _build_and_connect(self):
        hub_url = f"{settings.DONATEX_API_BASE_URL}/public-donations-hub?access_token={self._access_token}"
        logger.info(f"[{self.platform_user_id}] Building SignalR connection to {settings.DONATEX_API_BASE_URL}/public-donations-hub...")

        self._connection = (
            AIOHubConnectionBuilder()
            .with_url(hub_url)
            .with_automatic_reconnect(
                {"type": "raw", "keep_alive_interval": 10, "reconnect_interval": 5, "max_attempts": 5}
            )
            .configure_logging(logging_level=logging.WARNING)
            .build()
        )

        self._connection.on_open(self._on_open)
        self._connection.on_close(self._on_close)
        self._connection.on_error(self._on_error)
        self._connection.on("DonationCreated", self._on_donation_received)  # type: ignore

        try:
            await self._connection.start()
            logger.info(f"[{self.platform_user_id}] SignalR connection established successfully.")
        except HTTPError as e:
            if e.code == 401:
                logger.warning(f"[{self.platform_user_id}] Received HTTP 401 Unauthorized. Attempting token refresh...")
                new_token_data = await refresh_access_token(self._refresh_token, self.user_id, self.platform_user_id)

                if new_token_data:
                    self._access_token = new_token_data["access_token"]
                    self._refresh_token = new_token_data["refresh_token"]
                    self.expires_at = new_token_data["expires_in"] + int(time.time())

                    logger.info(f"[{self.platform_user_id}] Tokens updated successfully. Reconnecting with fresh access token...")
                    await self._build_and_connect()
                else:
                    logger.error(f"[{self.platform_user_id}] Failed to refresh token after 401. Aborting connection.")
                    self._is_running = False
                    raise
            else:
                logger.error(f"[{self.platform_user_id}] HTTP error {e.code} during SignalR connection: {e}")
                self._is_running = False
                raise
        except Exception as e:
            logger.exception(f"[{self.platform_user_id}] Unexpected error on SignalR start: {e}")
            self._is_running = False
            raise

    async def stop(self):
        async with self._connect_lock:
            if not self._is_running:
                return

            self._is_running = False
            logger.info(f"[{self.platform_user_id}] Stopping SignalR Listener...")

            if self._connection:
                with suppress(Exception):
                    await self._connection.stop()
                self._connection = None
            logger.info(f"[{self.platform_user_id}] SignalR Listener stopped cleanly.")

    # --- Синхронные прослойки для вызова асинхронного хэндлера ---

    def _on_donation_received(self, data):
        """Вызывается потоком SignalR при получении события DonationCreated."""
        if not data or not isinstance(data, (list, tuple)) or len(data) == 0:
            logger.warning(f"[{self.platform_user_id}] Received empty or malformed data payload on DonationCreated: {data}")
            return

        if not self._loop or not self._loop.is_running():
            logger.error(f"[{self.platform_user_id}] Event loop is not running, unable to process donation event")
            return

        donation_payload = data[0]
        logger.info(f"[{self.platform_user_id}] Received DonationCreated event via SignalR")
        logger.debug(f"[{self.platform_user_id}] Donation payload: {donation_payload}")

        future = asyncio.run_coroutine_threadsafe(
            self._handler(donation_payload, self.user_id, self.platform_user_id), self._loop
        )

        def check_result(fut):
            try:
                fut.result()
            except Exception as e:
                logger.exception(f"[{self.platform_user_id}] Error in async donation handler: {e}")

        future.add_done_callback(check_result)

    def _on_open(self):
        logger.info(f"[{self.platform_user_id}] SignalR socket connection opened.")

    def _on_close(self):
        logger.info(f"[{self.platform_user_id}] SignalR socket connection closed.")

    def _on_error(self, error):
        logger.error(f"[{self.platform_user_id}] SignalR socket error: {error}")
