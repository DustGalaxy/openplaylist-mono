import time
import asyncio
import logging
from contextlib import suppress
from urllib.error import HTTPError
from uuid import UUID

import aiohttp
from signalrcore.aio.aio_hub_connection_builder import AIOHubConnectionBuilder

from src.adapters._rabbit.bots.dto import DonateXTokenRefreshed
from src._types import Handler, IDonateXListener
from src.settings import settings
from src.adapters._rabbit.bots import (
    rabbit_broker,
    main_exchange,
    auth_user_donatex_tokens_refreshed,
    user_token_died,
)

logger = logging.getLogger(__name__)


async def refresh_access_token(refresh_token: str, user_id: UUID, platform_user_id: str):
    async with aiohttp.ClientSession() as session:
        data = {
            "refresh_token": refresh_token,
            "client_id": settings.DONATEX_CLIENT_ID,
            "grant_type": "refresh_token",
            "client_secret": settings.DONATEX_CLIENT_SECRET,
        }
        async with session.post(settings.DONATEX_TOKEN_URL, data=data) as response:
            print(f"Статус: {response.status}")

            if response.status == 200:
                json_data = await response.json()
                data = DonateXTokenRefreshed(
                    user_id=user_id,
                    platform_user_id=platform_user_id,
                    access_token=json_data["access_token"],
                    refresh_token=json_data["refresh_token"],
                    expires_at=json_data["expires_in"] + int(time.time()),
                )

                await rabbit_broker.publish(data, auth_user_donatex_tokens_refreshed, main_exchange)
            else:
                await rabbit_broker.publish(
                    {
                        "refresh_token": refresh_token,
                        "platform_user_id": platform_user_id,
                    },
                    user_token_died,
                    exchange=main_exchange,
                )


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
                logger.info(f"[{self.user_id}] SignalR Listener is already running.")
                return

            self._is_running = True
            self._loop = asyncio.get_running_loop()

            # Искусственная задержка в 0.5 секунд перед установкой соединения
            logger.info(f"[{self.user_id}] Waiting {BASE_CONNECTION_COOLDOWN_SEC}s before connecting...")
            await asyncio.sleep(BASE_CONNECTION_COOLDOWN_SEC)

            await self._build_and_connect()

    async def _build_and_connect(self):
        logger.info(f"[{self.user_id}] Connecting to SignalR...")

        self._connection = (
            AIOHubConnectionBuilder()
            .with_url(f"{settings.DONATEX_API_BASE_URL}/public-donations-hub?access_token={self._access_token}")
            .with_automatic_reconnect(
                {"type": "raw", "keep_alive_interval": 10, "reconnect_interval": 5, "max_attempts": 5}
            )
            .configure_logging(logging_level=logging.INFO)
            .build()
        )

        self._connection.on_open(self._on_open)
        self._connection.on_close(self._on_close)
        self._connection.on_error(self._on_error)
        self._connection.on("DonationCreated", self._on_donation_received)  # type: ignore

        try:
            # Запускаем в потоке, так как метод блокирующий
            await self._connection.start()

        except HTTPError as e:
            # Обработка ошибки авторизации (401)

            if e.code == 401:
                logger.warning(f"[{self.user_id}] Received 401 Unauthorized. Trying to refresh token...")

                # Вызываем вашу функцию рефреша (как в da_client)
                new_token_data = await refresh_access_token(self._refresh_token, self.user_id, self.platform_user_id)

                if new_token_data:
                    # Обновляем внутренние данные
                    self._access_token = new_token_data["access_token"]
                    self._refresh_token = new_token_data["refresh_token"]
                    self.expires_at = new_token_data["expires_in"] + int(time.time())

                    # Рекурсивно пробуем подключиться заново с новым токеном
                    logger.info(f"[{self.user_id}] Token refreshed successfully. Reconnecting...")
                    await self._build_and_connect()
                else:
                    logger.error(
                        f"[{self.user_id}] Critical: Failed to refresh token after 401. Stopping connection proccess."
                    )
                    self._is_running = False
                    raise e
            else:
                logger.error(f"[{self.user_id}] HTTP error during connection: {e}")
                self._is_running = False
                raise e

        except Exception as e:
            logger.exception(f"[{self.user_id}] Unexpected error on SignalR start: {e}")
            self._is_running = False
            raise e

    async def stop(self):
        async with self._connect_lock:
            if not self._is_running:
                return

            self._is_running = False
            logger.info(f"[{self.user_id}] Stopping SignalR Listener...")

            if self._connection:
                with suppress(Exception):
                    # Останавливаем соединение в отдельном потоке
                    await self._connection.stop()
                self._connection = None

    # --- Синхронные прослойки для вызова асинхронного хэндлера ---

    def _on_donation_received(self, data):
        """Вызывается потоком SignalR при получении события."""
        if data and self._loop:
            logger.info("data for SignalR on donate event: " + str(data))
            donation_payload = data[0]
            future = asyncio.run_coroutine_threadsafe(
                self._handler(donation_payload, self.user_id, self.platform_user_id), self._loop
            )

            def check_result(fut):
                try:
                    fut.result()  # Если была ошибка, этот метод её выбросит
                except Exception as e:
                    logger.exception(f"[{self.user_id}] Error inside async handler: {e}")

            future.add_done_callback(check_result)

    def _on_open(self):
        logger.info(f"[{self.user_id}] SignalR connection opened successfully.")

    def _on_close(self):
        logger.info(f"[{self.user_id}] SignalR connection closed.")

    def _on_error(self, error):
        logger.error(f"[{self.user_id}] SignalR error: {error}")
