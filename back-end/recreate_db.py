import asyncio

from src.database import create_db, drop_db


async def recreate_db():
    await drop_db()
    await create_db()


if __name__ == "__main__":
    asyncio.run(recreate_db())
