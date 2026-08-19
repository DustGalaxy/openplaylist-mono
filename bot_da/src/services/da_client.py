import asyncio
import json
import logging
import time
from contextlib import suppress
from uuid import UUID

import httpx
import websockets
from websockets.exceptions import ConnectionClosedError, ConnectionClosedOK, InvalidStatus

from src._types import Handler
from src.api.da_api import DonationAlertsApiClient, da_api_client
from src.config import settings


logger = logging.getLogger(__name__)

BUFFER_SECONDS = 60


def is_token_expired_or_near_expiry(expires_at: int) -> bool:
    if not expires_at:
        return False
    return time.time() >= (expires_at - BUFFER_SECONDS)


class DonationAlertsListener:
    def __init__(
        self,
        user_id: UUID,
        platform_user_id: str,
        access_token: str,
        refresh_token: str,
        expires_at: int,
        handler: Handler,
        api_client: DonationAlertsApiClient | None = None,
    ):
        self.user_id = user_id
        self.platform_user_id = str(platform_user_id)
        self._access_token = access_token
        self._refresh_token = refresh_token
        self.expires_at = expires_at
        self._handler = handler
        self._api_client = api_client or da_api_client

        self._ws: websockets.ClientConnection | None = None
        self._client_id: str | None = None
        self._da_user_id: str | None = None
        self._listen_task: asyncio.Task | None = None
        self._reconnect_delay = 5
        self._max_reconnect_delay = 60
        self._is_running = False
        self._connect_lock = asyncio.Lock()

    async def start(self) -> None:
        async with self._connect_lock:
            if self._is_running:
                logger.info(f"[{self.platform_user_id}] DonationAlerts listener is already running.")
                return

            self._is_running = True
            logger.info(f"[{self.platform_user_id}] Starting DonationAlerts listener...")

            if self._listen_task and not self._listen_task.done():
                self._listen_task.cancel()
                with suppress(asyncio.CancelledError):
                    await self._listen_task

            self._listen_task = asyncio.create_task(self._connection_loop())

    async def stop(self) -> None:
        async with self._connect_lock:
            if not self._is_running:
                return

            self._is_running = False
            logger.info(f"[{self.platform_user_id}] Stopping DonationAlerts listener...")

            if self._listen_task and not self._listen_task.done():
                self._listen_task.cancel()
                with suppress(asyncio.CancelledError):
                    await self._listen_task
                self._listen_task = None

            if self._ws:
                with suppress(Exception):
                    await self._ws.close()
                self._ws = None

            self._client_id = None
            self._reconnect_delay = 5
            logger.info(f"[{self.platform_user_id}] DonationAlerts listener stopped cleanly.")

    async def _connection_loop(self) -> None:
        while self._is_running:
            if is_token_expired_or_near_expiry(self.expires_at):
                logger.info(f"[{self.platform_user_id}] Token expired or near expiry, refreshing...")
                refreshed = await self._api_client.refresh_token(self._refresh_token, self.user_id, self.platform_user_id)
                if not refreshed:
                    logger.error(f"[{self.platform_user_id}] Failed to refresh token. Halting connection loop.")
                    self._is_running = False
                    break

                self._access_token = refreshed["access_token"]
                self._refresh_token = refreshed.get("refresh_token") or self._refresh_token
                self.expires_at = refreshed.get("expires_in", 86400) + int(time.time())

            try:
                logger.info(f"[{self.platform_user_id}] Fetching DA user info and socket connection token...")
                user_info = await self._api_client.get_user_info(self._access_token)
                self._da_user_id = user_info["user_id"]
                socket_token = user_info["socket_connection_token"]

                channel_name = f"$alerts:donation_{self._da_user_id}"
                logger.info(f"[{self.platform_user_id}] Connecting WebSocket to Centrifugo for channel {channel_name}...")

                await self._connect_and_listen(socket_token, channel_name)
                self._reconnect_delay = 5

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401:
                    logger.warning(f"[{self.platform_user_id}] Received 401 Unauthorized from DA API. Refreshing token...")
                    refreshed = await self._api_client.refresh_token(self._refresh_token, self.user_id, self.platform_user_id)
                    if refreshed:
                        self._access_token = refreshed["access_token"]
                        self._refresh_token = refreshed.get("refresh_token") or self._refresh_token
                        self.expires_at = refreshed.get("expires_in", 86400) + int(time.time())
                        continue
                    else:
                        logger.error(f"[{self.platform_user_id}] Token refresh failed after 401. Halting connection loop.")
                        self._is_running = False
                        break
                else:
                    logger.error(
                        f"[{self.platform_user_id}] HTTP error from DA API: {e}. Reconnecting in {self._reconnect_delay}s..."
                    )
                    await asyncio.sleep(self._reconnect_delay)
                    self._reconnect_delay = min(self._reconnect_delay * 2, self._max_reconnect_delay)

            except (httpx.RequestError, ValueError, ConnectionClosedError, InvalidStatus) as e:
                logger.error(f"[{self.platform_user_id}] Connection error: {e}. Reconnecting in {self._reconnect_delay}s...")
                await asyncio.sleep(self._reconnect_delay)
                self._reconnect_delay = min(self._reconnect_delay * 2, self._max_reconnect_delay)

            except ConnectionClosedOK:
                logger.info(f"[{self.platform_user_id}] WebSocket closed normally by server (OK). Reconnecting in 5s...")
                self._reconnect_delay = 5
                await asyncio.sleep(self._reconnect_delay)

            except asyncio.CancelledError:
                logger.info(f"[{self.platform_user_id}] Connection loop task cancelled.")
                break

            except Exception as e:
                logger.exception(f"[{self.platform_user_id}] Unexpected error in connection loop: {e}. Stopping.")
                self._is_running = False
                break

            if self._is_running:
                await asyncio.sleep(1)

        logger.info(f"[{self.platform_user_id}] Connection loop terminated.")

    async def _connect_and_listen(self, socket_token: str, channel_name: str) -> None:
        async with websockets.connect(settings.DA_CENTRIFUGO_URL) as ws:
            self._ws = ws
            logger.info(f"[{self.platform_user_id}] Connected to Centrifugo WebSocket: {settings.DA_CENTRIFUGO_URL}")

            # 1. Socket Authentication
            auth_payload = {"params": {"token": socket_token}, "id": 1}
            await ws.send(json.dumps(auth_payload))

            auth_response_str = await ws.recv()
            auth_response = json.loads(auth_response_str)
            logger.debug(f"[{self.platform_user_id}] Auth response: {auth_response_str}")

            if auth_response.get("id") == 1 and "result" in auth_response and "client" in auth_response["result"]:
                self._client_id = auth_response["result"]["client"]
                logger.info(f"[{self.platform_user_id}] WebSocket authenticated. Client ID: {self._client_id}")
            else:
                raise ValueError(f"WebSocket auth failed: {auth_response_str}")

            # 2. Get Subscription Token
            sub_token = await self._api_client.get_subscription_token(self._access_token, self._client_id, channel_name)

            # 3. Subscribe to Channel
            subscribe_payload = {
                "id": 2,
                "method": 1,
                "params": {"channel": channel_name, "token": sub_token},
            }
            await ws.send(json.dumps(subscribe_payload))
            logger.info(f"[{self.platform_user_id}] Sent subscription request for {channel_name}. Waiting for donations...")

            # 4. Message Consumer Loop
            async for message_str in ws:
                logger.debug(f"[{self.platform_user_id}] Raw Centrifugo message: {message_str}")
                try:
                    await self._handler(message_str, self.user_id, channel_name)
                except Exception as e:
                    logger.exception(f"[{self.platform_user_id}] Error in donation message handler: {e}")
