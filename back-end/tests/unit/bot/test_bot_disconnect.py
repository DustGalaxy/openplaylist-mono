from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from src._types import IntegrationPlatform
from src.adapters._rabbit.queues import main_exchange
from src.models.auth_user import AuthUserSchema
from src.models.linked_accounts import LinkedAccountsDomain


@pytest.fixture
def base_user():
    return AuthUserSchema(
        id=uuid4(),
        username="streamer",
        email="streamer@test.com",
        password="hash",
        email_confirmed=True,
        is_active=True,
        last_login=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )


@pytest.mark.asyncio
async def test_disconnect_bot_integration_not_found(auth_service, mock_db_session, base_user):
    """Ошибка 400: Интеграция с указанной платформой/id не найдена."""
    base_user.linked_accounts = []

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.disconnect_bot(mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123")

    assert exc_info.value.status_code == 400
    assert "User does not have a" in exc_info.value.detail


@pytest.mark.asyncio
async def test_disconnect_bot_already_disconnected(auth_service, mock_db_session, base_user):
    """Успех: Бот уже не подключен (bot_connection=False). Метод сразу возвращает True."""
    integration = LinkedAccountsDomain(
        id=uuid4(),
        user_id=base_user.id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_123",
        platform_username="tw",
        platform_avatar_url="url",
        platform_user_email="m@m.com",
        bot_connection=False,  # Бот уже отключен
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    base_user.linked_accounts = [integration]

    result = await auth_service.disconnect_bot(mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123")

    assert result is True
    auth_service.link_repo.update.assert_not_called()


@pytest.mark.asyncio
async def test_disconnect_bot_timeout(auth_service, mock_db_session, base_user, mocker):
    """Ошибка 500: Брокер выбросил TimeoutError при попытке отключить бота."""
    integration = LinkedAccountsDomain(
        id=uuid4(),
        user_id=base_user.id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_123",
        platform_username="tw",
        platform_avatar_url="url",
        platform_user_email="m@m.com",
        bot_connection=True,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    base_user.linked_accounts = [integration]

    mock_strategy = MagicMock()
    mock_strategy.get_bot_disconect_queue.return_value = "twitch_disconnect_queue"
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    # Имитируем таймаут
    mocker.patch("src.services.auth.auth_service.broker.request", AsyncMock(side_effect=TimeoutError()))

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.disconnect_bot(mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123")

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "Bot unavalible"
    # Статус в объекте не должен был измениться
    assert integration.bot_connection is True


@pytest.mark.asyncio
async def test_disconnect_bot_success(auth_service, mock_db_session, base_user, mocker):
    """Успех: Бот отключен через RPC, bot_connection изменен на False, запись в БД обновлена."""
    platform_user_id = "twitch_123"
    integration = LinkedAccountsDomain(
        id=uuid4(),
        user_id=base_user.id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id=platform_user_id,
        platform_username="tw",
        platform_avatar_url="url",
        platform_user_email="m@m.com",
        bot_connection=True,
        bot_settings={"prefix": "!"},
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    base_user.linked_accounts = [integration]

    mock_strategy = MagicMock()
    mock_strategy.get_bot_disconect_queue.return_value = "twitch_disconnect_queue"
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    mock_broker_request = mocker.patch("src.services.auth.auth_service.broker.request", AsyncMock())
    auth_service.link_repo.update = AsyncMock()

    result = await auth_service.disconnect_bot(mock_db_session, base_user, IntegrationPlatform.TWITCH, platform_user_id)

    # Проверки
    assert result is True
    assert integration.bot_connection is False

    mock_broker_request.assert_called_once_with(
        platform_user_id, queue="twitch_disconnect_queue", exchange=main_exchange, timeout=5
    )
    auth_service.link_repo.update.assert_called_once_with(mock_db_session, integration)
