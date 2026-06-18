from datetime import datetime

import pytest
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock

from fastapi import HTTPException
from simple_repository.exceptions import NotFoundException

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
async def test_register_classic_email_exists(auth_service, mock_db_session):
    """Ошибка: Попытка регистрации на уже существующий email."""
    # Передаем все недостающие обязательные поля
    existing_user = AuthUserSchema(
        id=uuid4(),
        username="existing",
        email="taken@test.com",
        password="hash",
        email_confirmed=True,
        is_active=True,
        last_login=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    auth_service.user_repo.get_one = AsyncMock(return_value=existing_user)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.register_classic(mock_db_session, "new_user", "taken@test.com", "password123")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Email already exists"
    auth_service.user_repo.get_one.assert_called_once_with(mock_db_session, "taken@test.com", column="email")


@pytest.mark.asyncio
async def test_register_classic_success(auth_service, mock_db_session, mocker):
    """Успешная регистрация: Хэширование, запись во временную сессию Redis и вызов отправки письма."""
    email = "new@test.com"
    password = "secure_password"
    username = "new_user"
    mock_hash = "hashed_secure_password"

    # Пользователь не найден в репозитории
    auth_service.user_repo.get_one = AsyncMock(side_effect=NotFoundException())

    # Настраиваем mock хэшера напрямую
    auth_service.hasher.hash.return_value = mock_hash

    # Мокаем Redis брокер
    mock_redis = MagicMock()
    mocker.patch("src.services.auth.auth_service.get_broker", return_value=mock_redis)

    # Мокаем метод отправки подтверждения
    auth_service.set_up_email_confirm = AsyncMock()

    # Вызов метода
    result = await auth_service.register_classic(mock_db_session, username, email, password)

    # Проверки
    assert result is None
    auth_service.hasher.hash.assert_called_once_with(password)

    # Проверяем запись в Redis
    mock_redis.set.assert_called_once()
    called_key = mock_redis.set.call_args[0][0]
    called_value = mock_redis.set.call_args[0][1]
    called_ex = mock_redis.set.call_args[1].get("ex")

    assert called_key.startswith(f"email_new_user_data:{email}:")
    assert f'"username":"{username}"' in called_value
    assert f'"email":"{email}"' in called_value
    assert f'"password":"{mock_hash}"' in called_value
    assert called_ex == 600

    # Проверяем вызов метода генерации ссылки подтверждения
    auth_service.set_up_email_confirm.assert_called_once()
