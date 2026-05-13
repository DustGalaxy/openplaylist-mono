import pytest
from typing import TYPE_CHECKING
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from database import async_session_maker, create_db, drop_db

if TYPE_CHECKING:
    from src.main import app
    from src._types import Platform
    from src.orm.auth_user import User
    from src.orm.linked_accounts import LinkedAccounts
    from src.orm.token_vault import TokenVault

    from src.adapters._redis.broker import RedisAdapter
    from src.settings import settings
else:
    from main import app
    from _types import Platform
    from adapters._redis.broker import RedisAdapter
    from orm.auth_user import User
    from orm.linked_accounts import LinkedAccounts
    from orm.token_vault import TokenVault

    from settings import settings

user_cookie = {
    "auth": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJzdWIiOiIwMTllMTcyYS1lZmI2LTczODgtYmQzMi03NDY2OTE3NTFkNjciLCJ1c2VybmFtZSI6IkR1c3RHYWxheHkiLCJleHAiOjE3Nzg3MDQ3ODcsImlhdCI6MTc3ODY2ODc4NywiaXNzIjoicmF2bGlrIn0."
    "XO4No3q4X9sKhAEr8V6SkGaa4EsVZhsBw4g-N38z4NMLF1tohxxFu06x1wr9XJBAzHUqtEedFNEOHH24JeesKDTgupI7v-tMNTTE6toichHhc5BqX21tAFIFwAE0o-FO8o8S_1bdcTQlGQtZVeAOBdWJJr7KkWBTATBsI5vcZTeHlMhjSZRijv69vd7sliD3gYCA5_ZORW_xdRs5wqhYyv9FyXFB2b5w01pj4g0NQn-XWqX6t6FrGBAqnHygO-X1ChEiQF5vb-pwMVfy2xCVC87GNdwrpc9wqMpIUlp3Q0qtaWfLQS4e752Tr8qVrDjEBdVmC_1C4KaLnG1vVa9TeQ"
}


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
async def test_user(db_session: AsyncSession):
    user = User(
        username="test_user",
        email="a@b.com",
        email_confirmed=True,
        password="123456",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_link(db_session: AsyncSession, test_user: User):
    link = LinkedAccounts(
        user_id=test_user.id,
        platform=Platform.TWITCH,
        platform_user_email="a@b.com",
        platform_user_id="654321",
        platform_username="test_name",
        platform_avatar_url="https://example.com/avatar.jpg",
    )
    db_session.add(link)
    await db_session.commit()
    await db_session.refresh(link)
    return link


@pytest.fixture
async def test_tokens(db_session: AsyncSession, test_user: User, test_link: LinkedAccounts):
    tokens = TokenVault(
        user_id=test_user.id,
        linked_account_id=test_link.id,
        platform=Platform.TWITCH,
        platform_user_id="654321",
        token_type="Bearer",
        access_token="access_token",
        refresh_token="refresh_token",
        expires_at=17000000000,
    )
    db_session.add(tokens)
    await db_session.commit()
    await db_session.refresh(tokens)
    return tokens


@pytest.fixture
async def client():
    # Клиент для запросов к API
    client = TestClient(app)
    yield client
