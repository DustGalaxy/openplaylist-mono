import pytest
from datetime import datetime
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock

from fastapi import HTTPException
from simple_repository.exceptions import NotFoundException

from src._types import IntegrationPlatform
from src.models.auth_user import AuthUserSchema
from src.models.linked_accounts import LinkedAccountsDomain
from src.adapters._rabbit.queues import main_exchange


@pytest.mark.asyncio
async def test_delete_integration_user_not_found(auth_service, mock_db_session):
    """Ошибка: Пользователь не найден в системе (404)."""
    auth_service.user_repo.get_one = AsyncMock(side_effect=NotFoundException())

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.delete_integration(
            mock_db_session, user_id=uuid4(), type=IntegrationPlatform.TWITCH, platform_user_id="123"
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "User not found"


@pytest.mark.asyncio
async def test_delete_integration_not_found_on_user(auth_service, mock_db_session):
    """Ошибка: Пользователь существует, но у него нет указанной интеграции (400)."""
    user_id = uuid4()
    db_user = AuthUserSchema(
        id=user_id,
        username="user",
        email="test@test.com",
        password="hash",
        email_confirmed=True,
        is_active=True,
        last_login=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db_user.linked_accounts = []  # Нет интеграций
    auth_service.user_repo.get_one = AsyncMock(return_value=db_user)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.delete_integration(
            mock_db_session, user_id=user_id, type=IntegrationPlatform.TWITCH, platform_user_id="non_existent"
        )

    assert exc_info.value.status_code == 400
    assert "User does not have a" in exc_info.value.detail


@pytest.mark.asyncio
async def test_delete_integration_success_without_bot(auth_service, mock_db_session, mocker):
    """Успех: Удаление интеграции, у которой нет активного бота."""
    user_id = uuid4()
    link_id = uuid4()
    platform_user_id = "twitch_123"

    integration = LinkedAccountsDomain(
        id=link_id,
        user_id=user_id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id=platform_user_id,
        platform_username="tw",
        platform_avatar_url="url",
        platform_user_email="m@m.com",
        bot_connection=False,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    db_user = AuthUserSchema(
        id=user_id,
        username="user",
        email="test@test.com",
        password="hash",
        email_confirmed=True,
        is_active=True,
        last_login=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db_user.linked_accounts = [integration]

    # Настраиваем репозиторий: первый вызов возвращает юзера с интеграцией, второй — обновленного юзера
    auth_service.user_repo.get_one = AsyncMock(side_effect=[db_user, db_user])
    auth_service.link_repo.remove = AsyncMock()

    result = await auth_service.delete_integration(
        mock_db_session, user_id=user_id, type=IntegrationPlatform.TWITCH, platform_user_id=platform_user_id
    )

    assert result == db_user
    auth_service.link_repo.remove.assert_called_once_with(mock_db_session, link_id)


@pytest.mark.asyncio
async def test_delete_integration_success_with_bot_rpc(auth_service, mock_db_session, mocker):
    """Успех: Удаление интеграции с ботом. Проверяем RPC-запрос на отключение бота в RabbitMQ."""
    user_id = uuid4()
    link_id = uuid4()
    platform_user_id = "twitch_777"

    integration = LinkedAccountsDomain(
        id=link_id,
        user_id=user_id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id=platform_user_id,
        platform_username="tw",
        platform_avatar_url="url",
        platform_user_email="m@m.com",
        bot_connection=True,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    db_user = AuthUserSchema(
        id=user_id,
        username="user",
        email="test@test.com",
        password="hash",
        email_confirmed=True,
        is_active=True,
        last_login=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db_user.linked_accounts = [integration]

    auth_service.user_repo.get_one = AsyncMock(side_effect=[db_user, db_user])
    auth_service.link_repo.remove = AsyncMock()

    # Мокаем работу менеджера стратегий
    mock_strategy = MagicMock()
    mock_strategy.get_bot_disconect_queue.return_value = "twitch_disconnect_queue"
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    # Мокаем RabbitMQ брокер
    mock_broker_request = mocker.patch("src.services.auth.auth_service.broker.request", AsyncMock())

    result = await auth_service.delete_integration(
        mock_db_session, user_id=user_id, type=IntegrationPlatform.TWITCH, platform_user_id=platform_user_id
    )

    # Проверки
    assert result == db_user
    mock_broker_request.assert_called_once_with(
        platform_user_id,
        queue="twitch_disconnect_queue",
        exchange=main_exchange,  # Передаем оригинальный объект вместо патча
        timeout=5,
    )
    auth_service.link_repo.remove.assert_called_once_with(mock_db_session, link_id)
