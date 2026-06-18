import pytest
from datetime import datetime
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock

from fastapi import HTTPException
from simple_repository.exceptions import NotFoundException
from argon2.exceptions import VerifyMismatchError

from src.services.auth.auth_service import AuthService
from src.models.auth_user import AuthUserSchema

@pytest.fixture
def auth_service():
    """Инициализируем оригинальный AuthService с AsyncMock репозиториями."""
    user_repo = AsyncMock()
    link_repo = AsyncMock()
    token_vault_repo = AsyncMock()
    service = AuthService(user_repo, link_repo, token_vault_repo)
    
    # Мокаем hasher целиком, чтобы избежать read-only ограничений argon2 в Си
    service.hasher = MagicMock()
    
    return service

@pytest.fixture
def mock_db_session():
    return MagicMock()

@pytest.mark.asyncio
async def test_login_classic_success(auth_service, mock_db_session, mocker):
    """Успешный вход без необходимости рехеша пароля."""
    user_id = uuid4()
    raw_password = "secret_password"
    hashed_password = "hashed_secret_password"

    user = AuthUserSchema(
        id=user_id, username="test_user", email="user@test.com", password=hashed_password,
        email_confirmed=True, is_active=True, last_login=datetime.now(), created_at=datetime.now(), updated_at=datetime.now()
    )
    auth_service.user_repo.get_one = AsyncMock(return_value=user)

    # Настраиваем mock хэшера напрямую
    auth_service.hasher.verify.return_value = True
    auth_service.hasher.check_needs_rehash.return_value = False
    
    mocker.patch.object(auth_service, "encode_jwt", return_value="mocked_jwt_token")

    token = await auth_service.login_classic(mock_db_session, "user@test.com", raw_password)

    assert token == "mocked_jwt_token"
    auth_service.user_repo.get_one.assert_called_once_with(mock_db_session, "user@test.com", column="email")
    auth_service.hasher.verify.assert_called_once_with(hashed_password, raw_password)


@pytest.mark.asyncio
async def test_login_classic_success_with_rehash(auth_service, mock_db_session, mocker):
    """Успешный вход, старый хэш обновляется (check_needs_rehash == True)."""
    user_id = uuid4()
    raw_password = "old_hash_password"
    old_hash = "old_hashed_format"
    new_hash = "new_strong_hash"

    user = AuthUserSchema(
        id=user_id, username="rehash_user", email="user@test.com", password=old_hash,
        email_confirmed=True, is_active=True, last_login=datetime.now(), created_at=datetime.now(), updated_at=datetime.now()
    )
    auth_service.user_repo.get_one = AsyncMock(return_value=user)
    auth_service.user_repo.update = AsyncMock(return_value=user)

    # Настраиваем mock хэшера напрямую
    auth_service.hasher.verify.return_value = True
    auth_service.hasher.check_needs_rehash.return_value = True
    auth_service.hasher.hash.return_value = new_hash
    
    mocker.patch.object(auth_service, "encode_jwt", return_value="mocked_jwt_token")

    token = await auth_service.login_classic(mock_db_session, "user@test.com", raw_password)

    assert token == "mocked_jwt_token"
    assert user.password == new_hash
    auth_service.hasher.hash.assert_called_once_with(raw_password)
    auth_service.user_repo.update.assert_called_once_with(mock_db_session, user)


@pytest.mark.asyncio
async def test_login_classic_wrong_password(auth_service, mock_db_session):
    """Ошибка: Неверный пароль (hasher выбрасывает VerifyMismatchError)."""
    user = AuthUserSchema(
        id=uuid4(), username="test_user", email="user@test.com", password="correct_hash",
        email_confirmed=True, is_active=True, last_login=datetime.now(), created_at=datetime.now(), updated_at=datetime.now()
    )
    auth_service.user_repo.get_one = AsyncMock(return_value=user)
    
    # Задаем исключение через side_effect у mock-метода
    auth_service.hasher.verify.side_effect = VerifyMismatchError()

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.login_classic(mock_db_session, "user@test.com", "wrong_password")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Wrong password or email"
    