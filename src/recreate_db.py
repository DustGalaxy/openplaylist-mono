from database import create_db, drop_db
import asyncio

from orm.auth_user import User
from orm.linked_accounts import LinkedAccounts


async def recreate_db():
    await drop_db()
    await create_db()


if __name__ == "__main__":
    asyncio.run(recreate_db())
