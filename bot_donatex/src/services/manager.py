from contextlib import suppress
import logging

from src._types import IManager
from src.acl.user import UserACL
from src.adapters._rabbit.bots.dto import ConnectionData
from src.services.handler import handler
from src.services.signalr_client import SignalRListener

logger = logging.getLogger(__name__)


class SignalRManager(IManager):
    connections: list[SignalRListener] = []  # pyright: ignore[reportIncompatibleVariableOverride]

    def __init__(self) -> None:
        pass

    async def add_connection(self, data: ConnectionData):
        # Создаем клиента (в ConnectionData должен быть актуальный токен)
        client = SignalRListener(
            user_id=data.user_id,
            platform_user_id=data.platform_user_id,
            access_token=data.access_token,
            refresh_token=data.refresh_token,
            expires_at=data.expires_at,
            handler=handler,
            bot_settings=data.bot_settings if data.bot_settings else {},
        )
        await self.run_connection(client)

    async def start(self):
        """Запуск слушателей для всех пользователей при старте сервиса."""
        logger.info("Getting users...")
        users = await UserACL.get_users()
        if users is None:
            logger.info("Users resiving fail. Stoping.")
            raise TimeoutError

        logger.info("Users resieved! Start connections...")

        for user in users:
            try:
                await self.add_connection(user)
            except Exception as e:
                logger.error(f"Fail to connect user {user.user_id}. Error: {e}")
        logger.info("All users connected!")

    async def stop(self):
        """Корректная остановка всех соединений."""
        for connection in self.connections:
            await connection.stop()

        self.connections.clear()

    async def run_connection(self, client: SignalRListener):  # pyright: ignore[reportIncompatibleMethodOverride]
        await client.start()
        self.connections.append(client)

    async def stop_connection(self, client: SignalRListener):  # pyright: ignore[reportIncompatibleMethodOverride]
        await client.stop()
        with suppress(ValueError):
            self.connections.remove(client)
