import asyncio

from src.database import drop_db

if __name__ == "__main__":
    asyncio.run(drop_db())
