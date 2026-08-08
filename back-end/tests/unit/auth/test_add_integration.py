import pytest
from datetime import datetime
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock

from fastapi import HTTPException
from simple_repository.exceptions import NotFoundException

from src._types import AuthFlow, IntegrationPlatform, IntegrationType
from src.dto.internal.auth import PlatformAuthResult, PlatformMeta, PlatformUser, PlatformTokens
from src.models.auth_user import AuthUserSchema
from src.models.linked_accounts import LinkedAccountsDomain
from src.models.token_vault import TokenVaultDomain


@pytest.fixture
def mock_strategy_setup(mocker):
    """Вспомогательная функция для быстрой настройки стратегии."""

    def _setup(auth_flow: AuthFlow):
        mock_strategy = MagicMock()
        mock_strategy.meta = PlatformMeta(
            platform=IntegrationPlatform.TWITCH,
            integration_type=IntegrationType.IDENTITY_AND_BOT,
            auth_flow=auth_flow,
        )
        platform_result = PlatformAuthResult(
            user=PlatformUser(id="twitch_123", username="tw_user", avatar_url="url", email="test@test.com", email_verified=True),
            tokens=PlatformTokens(access_token="acc", refresh_token="ref", expires_at=1700000000, token_type="Bearer"),
        )
        mock_strategy.fetch_identity = AsyncMock(return_value=platform_result)
        mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)
        return mock_strategy

    return _setup


@pytest.mark.asyncio
async def test_add_integration_user_not_found(auth_service, mock_db_session, mock_strategy_setup):
    """Ошибка: Пользователь, которому добавляют интеграцию, не найден."""
    mock_strategy_setup(AuthFlow.AUTH_CODE)
    auth_service.user_repo.get_one = AsyncMock(side_effect=NotFoundException())

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.add_integration(mock_db_session, uuid4(), IntegrationPlatform.TWITCH, code="valid_code")

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "User not found"


@pytest.mark.asyncio
async def test_add_integration_already_exists_active(auth_service, mock_db_session, mock_strategy_setup):
    """Ошибка: Такая интеграция уже существует и она активна (is_dead=False)."""
    mock_strategy_setup(AuthFlow.AUTH_CODE)
    user_id = uuid4()

    existing_link = LinkedAccountsDomain(
        id=uuid4(),
        user_id=user_id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_123",
        platform_username="tw_user",
        platform_avatar_url="url",
        platform_user_email="test@test.com",
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
    db_user.linked_accounts = [existing_link]  # Добавляем в связанный список у юзера
    auth_service.user_repo.get_one = AsyncMock(return_value=db_user)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.add_integration(mock_db_session, user_id, IntegrationPlatform.TWITCH, code="valid_code")

    assert exc_info.value.status_code == 400
    assert "already has a" in exc_info.value.detail


@pytest.mark.asyncio
async def test_add_integration_reanimate_dead_link(auth_service, mock_db_session, mock_strategy_setup):
    """Успех: Интеграция существовала, но была мертвой (is_dead=True). Обновляем токены."""
    mock_strategy_setup(AuthFlow.AUTH_CODE)
    user_id = uuid4()
    link_id = uuid4()

    existing_link = LinkedAccountsDomain(
        id=link_id,
        user_id=user_id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_123",
        platform_username="tw_user",
        platform_avatar_url="url",
        platform_user_email="test@test.com",
        bot_connection=False,
        bot_settings=None,
        is_dead=True,
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
    db_user.linked_accounts = [existing_link]
    auth_service.user_repo.get_one = AsyncMock(return_value=db_user)

    mock_tokens = TokenVaultDomain(
        id=uuid4(),
        linked_account_id=link_id,
        token_type="Bearer",
        access_token="old",
        refresh_token="old",
        expires_at=0,
        linked_account=existing_link,
        last_update=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    auth_service.token_vault_repo.get_by_id_link = AsyncMock(return_value=mock_tokens)
    auth_service.token_vault_repo.update = AsyncMock()
    auth_service.link_repo.update = AsyncMock()

    result = await auth_service.add_integration(mock_db_session, user_id, IntegrationPlatform.TWITCH, code="valid_code")

    assert result == db_user
    assert existing_link.is_dead is False
    auth_service.token_vault_repo.update.assert_called_once_with(mock_db_session, mock_tokens)
    auth_service.link_repo.update.assert_called_once_with(mock_db_session, existing_link)


@pytest.mark.asyncio
async def test_add_integration_success_new(auth_service, mock_db_session, mock_strategy_setup, mocker):
    """Успех: Создание абсолютно новой интеграции."""
    mock_strategy_setup(AuthFlow.AUTH_CODE)
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
    db_user.linked_accounts = []  # Список интеграций пуст
    auth_service.user_repo.get_one = AsyncMock(return_value=db_user)

    created_link = LinkedAccountsDomain(
        id=uuid4(),
        user_id=user_id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_123",
        platform_username="tw_user",
        platform_avatar_url="url",
        platform_user_email="test@test.com",
        bot_connection=False,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    mocker.patch.object(auth_service, "create_link", AsyncMock(return_value=created_link))
    auth_service.token_vault_repo.create = AsyncMock()

    result = await auth_service.add_integration(mock_db_session, user_id, IntegrationPlatform.TWITCH, code="valid_code")

    assert result == db_user
    auth_service.create_link.assert_called_once()
    auth_service.token_vault_repo.create.assert_called_once()


@pytest.mark.parametrize(
    "auth_flow, kwargs, expected_err",
    [
        (AuthFlow.USER_KEY, {"user_key": None}, "This platform requires a personal token"),
        (AuthFlow.PKCE, {"code": None, "code_verifier": "123"}, "code and code_verifier are required for PKCE flow"),
        (AuthFlow.AUTH_CODE, {"code": None}, "code is required"),
    ],
)
@pytest.mark.asyncio
async def test_add_integration_flows_validation(
    auth_service, mock_db_session, mock_strategy_setup, auth_flow, kwargs, expected_err
):
    """Проверка валидации входных параметров под разные AuthFlow."""
    mock_strategy_setup(auth_flow)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.add_integration(
            db_session=mock_db_session, user_id=uuid4(), platform=IntegrationPlatform.TWITCH, **kwargs
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == expected_err
