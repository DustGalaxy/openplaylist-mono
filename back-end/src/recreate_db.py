from database import create_db, drop_db
import asyncio

from orm.auth_user import User
from orm.linked_accounts import LinkedAccounts
from orm.playlist import Playlist, OrderPlaylistStatus, Order
from orm.settings import Settings, BlockList, ContentSettings, DonationRules, ChatRules
from orm.token_vault import TokenVault


async def recreate_db():
    await drop_db()
    await create_db()


if __name__ == "__main__":
    asyncio.run(recreate_db())
