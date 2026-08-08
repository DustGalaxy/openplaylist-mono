import asyncio

from src.database import create_db, drop_db
from src.orm.auth_user import User
from src.orm.linked_accounts import LinkedAccounts
from src.orm.playlist import Playlist, OrderPlaylistStatus, Order
from src.orm.settings import Settings, BlockList, ContentSettings, DonationRules, ChatRules
from src.orm.token_vault import TokenVault


async def recreate_db():
    await drop_db()
    await create_db()


if __name__ == "__main__":
    asyncio.run(recreate_db())
