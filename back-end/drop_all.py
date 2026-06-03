from database import drop_db
import asyncio

from src.orm.auth_user import User
from src.orm.linked_accounts import LinkedAccounts
from src.orm.playlist import Playlist, OrderPlaylistStatus, Order
from src.orm.settings import Settings, BlockList, ContentSettings, DonationRules, ChatRules
from src.orm.token_vault import TokenVault


if __name__ == "__main__":
    asyncio.run(drop_db())
