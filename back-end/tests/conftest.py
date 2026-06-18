import pytest
from fastapi.testclient import TestClient

from database import async_session_maker, create_db, drop_db

from main import app

from src.adapters._redis.broker import RedisAdapter
from src.settings import settings


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def db_session():
    # Создаем движок, накатываем миграции, отдаем сессию
    await create_db()

    async with async_session_maker() as session:
        yield session

    await drop_db()


_broker = None


@pytest.fixture
async def get_broker() -> RedisAdapter:
    global _broker
    if _broker is None:
        _broker = RedisAdapter(settings.REDIS_URL + "/99", decode_responses=True)
    return _broker



@pytest.fixture
async def client():
    # Клиент для запросов к API
    client = TestClient(app)
    yield client
