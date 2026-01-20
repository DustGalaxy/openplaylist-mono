from _types import IManager, IDonationAlertsListener
from acl.user import UserACL
from adapters._rabbit.dto import LinkedAccountWithTokensRead
from adapters._repository.user import user_repo
from services.handler import handler
from services.da_client import DonationAlertsListener

from database import async_session_maker


class Manager(IManager):
    connections: list[IDonationAlertsListener] = []

    def __init__(self) -> None:
        pass

    async def add_connection(self, link: LinkedAccountWithTokensRead):
        client = DonationAlertsListener(link.user_id, link.access_token, link.refresh_token, link.expires_at, handler)

        await self.run_connection(client)
        async with async_session_maker() as session:
            await user_repo.get_one_or_create(session, link.platform_user_id, str(link.user_id))

    async def start(self):
        users = await UserACL.get_users()

        for user in users:
            client = DonationAlertsListener(
                user.user_id, user.access_token, user.refresh_token, user.expires_at, handler
            )

            await self.run_connection(client)

            async with async_session_maker() as session:
                await user_repo.get_one_or_create(session, user.da_id, str(user.user_id))

    async def stop(self):
        for connection in self.connections:
            await connection.stop()

        self.connections.clear()

    async def run_connection(self, client: IDonationAlertsListener):
        await client.start()
        self.connections.append(client)

    async def stop_connection(self, client: IDonationAlertsListener):
        await client.stop()
        self.connections.remove(client)
