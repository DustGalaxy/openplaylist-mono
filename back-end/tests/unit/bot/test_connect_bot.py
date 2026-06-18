import pytest
from datetime import datetime
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock

from fastapi import HTTPException
from src._types import IntegrationPlatform
from src.models.auth_user import AuthUserSchema
from src.models.linked_accounts import LinkedAccountsDomain
from src.models.token_vault import TokenVaultDomain
from src.adapters._rabbit.event_broker import main_exchange


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
async def test_connect_bot_platform_not_supported(auth_service, mock_db_session, base_user, mocker):
    """Ошибка 400: Платформа не поддерживает функционал бота."""
    mocker.patch("src.services.auth.strategy_manager.manager.supports_bot", return_value=False)
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=MagicMock())

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.connect_bot(mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123")

    assert exc_info.value.status_code == 400
    assert "does not support bot" in exc_info.value.detail


@pytest.mark.asyncio
async def test_connect_bot_integration_not_found(auth_service, mock_db_session, base_user, mocker):
    """Ошибка 403: У пользователя нет такой интеграции."""
    mocker.patch("src.services.auth.strategy_manager.manager.supports_bot", return_value=True)
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=MagicMock())
    base_user.linked_accounts = []  # Список линков пуст

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.connect_bot(mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123")

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "User does not have a needed integration"


@pytest.mark.asyncio
async def test_connect_bot_queue_not_configured(auth_service, mock_db_session, base_user, mocker):
    """Ошибка 500: Очередь для подключения бота не настроена в стратегии."""
    mocker.patch("src.services.auth.strategy_manager.manager.supports_bot", return_value=True)

    integration = LinkedAccountsDomain(
        id=uuid4(),
        user_id=base_user.id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_123",
        platform_username="tw",
        platform_avatar_url="url",
        platform_user_email="m@m.com",
        bot_connection=False,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    base_user.linked_accounts = [integration]

    mock_strategy = MagicMock()
    mock_strategy.get_bot_queue.return_value = None  # Очередь отсутствует
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.connect_bot(mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123")

    assert exc_info.value.status_code == 500
    assert "Bot queue not configured" in exc_info.value.detail


@pytest.mark.asyncio
async def test_connect_bot_failed_connection_response(auth_service, mock_db_session, base_user, mocker):
    """Ошибка 500: Бот ответил False (не смог подключиться)."""
    mocker.patch("src.services.auth.strategy_manager.manager.supports_bot", return_value=True)
    mocker.patch("src.services.auth.strategy_manager.manager.default_bot_settings", return_value={"prefix": "!"})

    link_id = uuid4()
    integration = LinkedAccountsDomain(
        id=link_id,
        user_id=base_user.id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_123",
        platform_username="tw",
        platform_avatar_url="url",
        platform_user_email="m@m.com",
        bot_connection=False,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    base_user.linked_accounts = [integration]

    mock_strategy = MagicMock()
    mock_strategy.get_bot_queue.return_value = "twitch_bot_queue"
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    # Настройка токенов
    mock_tokens = TokenVaultDomain(
        id=uuid4(),
        linked_account_id=link_id,
        token_type="Bearer",
        access_token="acc",
        refresh_token="ref",
        expires_at=100,
        linked_account=integration,
        last_update=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    auth_service.token_vault_repo.get_by_id_link = AsyncMock(return_value=mock_tokens)

    # Имитируем ответ от брокера, возвращающий False при декодировании
    mock_response = AsyncMock()
    mock_response.decode = AsyncMock(return_value=False)
    mocker.patch("src.services.auth.auth_service.broker.request", AsyncMock(return_value=mock_response))

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.connect_bot(mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123")

    assert exc_info.value.status_code == 500
    assert "Failed to connect bot" in exc_info.value.detail


@pytest.mark.asyncio
async def test_connect_bot_timeout(auth_service, mock_db_session, base_user, mocker):
    """Ошибка 500: Брокер выбросил TimeoutError во время ожидания ответа."""
    mocker.patch("src.services.auth.strategy_manager.manager.supports_bot", return_value=True)

    link_id = uuid4()
    integration = LinkedAccountsDomain(
        id=link_id,
        user_id=base_user.id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_123",
        platform_username="tw",
        platform_avatar_url="url",
        platform_user_email="m@m.com",
        bot_connection=False,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    base_user.linked_accounts = [integration]

    mock_strategy = MagicMock()
    mock_strategy.get_bot_queue.return_value = "twitch_bot_queue"
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)
    auth_service.token_vault_repo.get_by_id_link = AsyncMock()

    # Падаем по таймауту
    mocker.patch("src.services.auth.auth_service.broker.request", AsyncMock(side_effect=TimeoutError()))

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.connect_bot(mock_db_session, base_user, IntegrationPlatform.TWITCH, "twitch_123")

    assert exc_info.value.status_code == 500
    assert "Failed to connect bot" in exc_info.value.detail


@pytest.mark.asyncio
async def test_connect_bot_success(auth_service, mock_db_session, base_user, mocker):
    """Успех: Бот успешно подключен, отправлен WebSocket ack, данные обновлены."""
    platform_user_id = "twitch_123"
    default_settings = {"prefix": "!"}
    link_id = uuid4()

    mocker.patch("src.services.auth.strategy_manager.manager.supports_bot", return_value=True)
    mocker.patch("src.services.auth.strategy_manager.manager.default_bot_settings", return_value=default_settings)

    integration = LinkedAccountsDomain(
        id=link_id,
        user_id=base_user.id,
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
    base_user.linked_accounts = [integration]

    mock_strategy = MagicMock()
    mock_strategy.get_bot_queue.return_value = "twitch_bot_queue"
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    mock_tokens = TokenVaultDomain(
        id=uuid4(),
        linked_account_id=link_id,
        token_type="Bearer",
        access_token="acc_token",
        refresh_token="ref_token",
        expires_at=999,
        linked_account=integration,
        last_update=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    auth_service.token_vault_repo.get_by_id_link = AsyncMock(return_value=mock_tokens)

    # Возвращаем успешный ответ (True)
    mock_response = AsyncMock()
    mock_response.decode = AsyncMock(return_value=True)
    mock_broker_request = mocker.patch(
        "src.services.auth.auth_service.broker.request", AsyncMock(return_value=mock_response)
    )

    auth_service.link_repo.update = AsyncMock()
    mock_sio_ack = mocker.patch("src.services.auth.auth_service.sio_service.ack_bot_connection", AsyncMock())

    # Вызов
    await auth_service.connect_bot(mock_db_session, base_user, IntegrationPlatform.TWITCH, platform_user_id)

    # Проверки изменений объекта линка
    assert integration.bot_connection is True
    assert integration.bot_settings == default_settings

    # Проверяем RPC вызов к RabbitMQ
    mock_broker_request.assert_called_once_with(
        {
            "access_token": "acc_token",
            "refresh_token": "ref_token",
            "expires_at": 999,
            "platform": IntegrationPlatform.TWITCH.value,
            "platform_user_id": platform_user_id,
            "user_id": str(base_user.id),
            "bot_settings": default_settings,
        },
        "twitch_bot_queue",
        main_exchange,
        timeout=10,
    )

    # Проверки репозитория и SIO-сервиса
    auth_service.link_repo.update.assert_called_once_with(mock_db_session, integration)
    mock_sio_ack.assert_called_once_with(str(IntegrationPlatform.TWITCH), str(base_user.id), platform_user_id)
