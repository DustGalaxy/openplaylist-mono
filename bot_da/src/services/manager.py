import logging
from contextlib import suppress

from src.acl.user import UserACL
from src.adapters._rabbit.dto import ConnectionData
from src.services.da_client import DonationAlertsListener
from src.services.handler import handler
from src.utils import find

logger = logging.getLogger(__name__)


class Manager:
    def __init__(self) -> None:
        self.connections: list[DonationAlertsListener] = []

    async def add_connection(self, data: ConnectionData) -> None:
        logger.info(
            f"Adding DonationAlerts connection for platform_user_id='{data.platform_user_id}' (user_id={data.user_id})..."
        )
        existing = find(self.connections, lambda conn: conn.platform_user_id == data.platform_user_id)
        if existing:
            logger.info(
                f"Connection for platform_user_id='{data.platform_user_id}' already exists. Replacing existing connection..."
            )
            await self.stop_connection(existing)

        client = DonationAlertsListener(
            user_id=data.user_id,
            platform_user_id=data.platform_user_id,
            access_token=data.access_token,
            refresh_token=data.refresh_token,
            expires_at=data.expires_at,
            handler=handler,
        )
        await self.run_connection(client)

    async def start(self) -> None:
        """Запуск слушателей для всех пользователей при старте сервиса."""
        logger.info("Fetching initial DonationAlerts users list from backend via RPC...")
        users = await UserACL.get_users()
        if users is None:
            logger.error("Failed to retrieve users list from backend after multiple retries.")
            raise TimeoutError("Failed to fetch initial users")

        logger.info(f"Retrieved {len(users)} user(s) from backend. Starting individual socket connections...")

        successful = 0
        for user in users:
            try:
                await self.add_connection(user)
                successful += 1
            except Exception as e:
                logger.error(
                    f"Failed to establish connection for user {user.user_id} (platform_user_id={user.platform_user_id}): {e}",
                    exc_info=True,
                )

        logger.info(f"Completed initial connection setup: {successful}/{len(users)} active.")

    async def stop(self) -> None:
        """Корректная остановка всех соединений."""
        logger.info(f"Stopping all active DonationAlerts connections ({len(self.connections)} total)...")
        for connection in list(self.connections):
            try:
                await connection.stop()
            except Exception as e:
                logger.error(f"Error stopping connection for platform_user_id={connection.platform_user_id}: {e}")

        self.connections.clear()
        logger.info("All DonationAlerts connections stopped.")

    async def run_connection(self, client: DonationAlertsListener) -> None:
        try:
            await client.start()
            self.connections.append(client)
            logger.info(
                f"Stream running for platform_user_id='{client.platform_user_id}'. Active streams: {len(self.connections)}"
            )
        except Exception as e:
            logger.error(
                f"Error while running connection for platform_user_id='{client.platform_user_id}': {e}",
                exc_info=True,
            )
            with suppress(Exception):
                await client.stop()
            raise

    async def stop_connection(self, client: DonationAlertsListener) -> None:
        logger.info(f"Stopping connection for platform_user_id='{client.platform_user_id}'...")
        try:
            await client.stop()
        except Exception as e:
            logger.error(
                f"Error during client.stop() for platform_user_id='{client.platform_user_id}': {e}",
                exc_info=True,
            )
        finally:
            with suppress(ValueError):
                self.connections.remove(client)
        logger.info(
            f"Connection stopped for platform_user_id='{client.platform_user_id}'. Remaining active: {len(self.connections)}"
        )
