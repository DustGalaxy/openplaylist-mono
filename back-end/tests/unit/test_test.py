from sqlalchemy.ext.asyncio import AsyncSession


def test_1(db_session: AsyncSession, test_user):
    assert test_user.username == "test_user"
    assert test_user.email == "a@b.com"