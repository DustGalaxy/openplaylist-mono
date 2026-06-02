from _types import IManager, IDonationAlertsListener
from acl.user import UserACL
from adapters._rabbit.dto import ConnectionData
from services.handler import handler
from services.da_client import DonationAlertsListener


class Manager(IManager):
    connections: list[IDonationAlertsListener] = []

    def __init__(self) -> None:
        pass

    async def add_connection(self, data: ConnectionData):
        client = DonationAlertsListener(
            data.user_id, data.platform_user_id, data.access_token, data.refresh_token, data.expires_at, handler
        )

        await self.run_connection(client)

    async def start(self):
        users = await UserACL.get_users()

        for user in users:
            client = DonationAlertsListener(
                user.user_id, user.da_id, user.access_token, user.refresh_token, user.expires_at, handler
            )

            await self.run_connection(client)

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
