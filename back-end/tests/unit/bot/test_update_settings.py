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
    """Базовый пользователь для тестов настроек бота."""
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
async def test_update_bot_settings_integration_not_found(auth_service, mock_db_session, base_user, mocker):
    """Ошибка 403: У пользователя нет интеграции с указанной платформой/id."""
    base_user.linked_accounts = []  # Интеграций нет

    mocker.patch("src.services.auth.strategy_manager.manager.validate_bot_settings", return_value={"theme": "dark"})
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=MagicMock())

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.update_bot_settings(
            mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123", {"theme": "dark"}
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Integration not found"


@pytest.mark.asyncio
async def test_update_bot_settings_bot_not_connected(auth_service, mock_db_session, base_user, mocker):
    """Ошибка 400: Интеграция есть, но бот к ней не подключен (bot_connection=False)."""
    integration = LinkedAccountsDomain(
        id=uuid4(),
        user_id=base_user.id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_123",
        platform_username="tw",
        platform_avatar_url="url",
        platform_user_email="m@m.com",
        bot_connection=False,  # Бот отключен
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    base_user.linked_accounts = [integration]

    mocker.patch("src.services.auth.strategy_manager.manager.validate_bot_settings", return_value={"theme": "dark"})
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=MagicMock())

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.update_bot_settings(
            mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123", {"theme": "dark"}
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Bot is not connected"


@pytest.mark.asyncio
async def test_update_bot_settings_queue_not_configured(auth_service, mock_db_session, base_user, mocker):
    """Ошибка 500: Стратегия платформы не вернула имя очереди (queue is None)."""
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

    mocker.patch("src.services.auth.strategy_manager.manager.validate_bot_settings", return_value={"theme": "dark"})

    mock_strategy = MagicMock()
    mock_strategy.get_bot_settings_queue.return_value = None  # Очередь не настроена
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.update_bot_settings(
            mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123", {"theme": "dark"}
        )

    assert exc_info.value.status_code == 500
    assert "Bot settings queue not configured" in exc_info.value.detail


@pytest.mark.asyncio
async def test_update_bot_settings_not_accepted(auth_service, mock_db_session, base_user, mocker):
    """Ошибка 500: Бот ответил False (не принял настройки по неизвестной причине)."""
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

    mocker.patch("src.services.auth.strategy_manager.manager.validate_bot_settings", return_value={"theme": "dark"})

    mock_strategy = MagicMock()
    mock_strategy.get_bot_settings_queue.return_value = "twitch_settings_queue"
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    # Брокер возвращает False
    mocker.patch("src.services.auth.auth_service.broker.request", AsyncMock(return_value=False))

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.update_bot_settings(
            mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123", {"theme": "dark"}
        )

    assert exc_info.value.status_code == 500
    assert "not accepted new settings by unknown reason" in exc_info.value.detail


@pytest.mark.asyncio
async def test_update_bot_settings_timeout(auth_service, mock_db_session, base_user, mocker):
    """Ошибка 500: Бот не ответил за отведенный таймаут (TimeoutError)."""
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

    mocker.patch("src.services.auth.strategy_manager.manager.validate_bot_settings", return_value={"theme": "dark"})

    mock_strategy = MagicMock()
    mock_strategy.get_bot_settings_queue.return_value = "twitch_settings_queue"
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    # Имитируем TimeoutError от брокера
    mocker.patch("src.services.auth.auth_service.broker.request", AsyncMock(side_effect=TimeoutError()))

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.update_bot_settings(
            mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123", {"theme": "dark"}
        )

    assert exc_info.value.status_code == 500
    assert "unavalible" in exc_info.value.detail


@pytest.mark.asyncio
async def test_update_bot_settings_success(auth_service, mock_db_session, base_user, mocker):
    """Успех: Бот принял настройки (True), они обновились в БД и вернулись из метода."""
    platform_user_id = "twitch_123"
    valid_settings = {"theme": "dark", "prefix": "!"}

    integration = LinkedAccountsDomain(
        id=uuid4(),
        user_id=base_user.id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id=platform_user_id,
        platform_username="tw",
        platform_avatar_url="url",
        platform_user_email="m@m.com",
        bot_connection=True,
        bot_settings={"theme": "light"},
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    base_user.linked_accounts = [integration]

    mocker.patch("src.services.auth.strategy_manager.manager.validate_bot_settings", return_value=valid_settings)

    mock_strategy = MagicMock()
    mock_strategy.get_bot_settings_queue.return_value = "twitch_settings_queue"
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    # Брокер подтверждает применение настроек (True)
    mock_request = mocker.patch("src.services.auth.auth_service.broker.request", AsyncMock(return_value=True))
    auth_service.link_repo.update = AsyncMock()

    result = await auth_service.update_bot_settings(
        mock_db_session, base_user, IntegrationPlatform.TWITCH, platform_user_id, valid_settings
    )

    # Проверки результатов
    assert result == valid_settings
    assert integration.bot_settings == valid_settings

    # Проверяем RPC вызов в RabbitMQ
    mock_request.assert_called_once_with(
        {
            "platform_user_id": platform_user_id,
            "settings": valid_settings,
        },
        "twitch_settings_queue",
        main_exchange,
        timeout=10,
    )
    # Проверяем сохранение в базу данных
    auth_service.link_repo.update.assert_called_once_with(mock_db_session, integration)
