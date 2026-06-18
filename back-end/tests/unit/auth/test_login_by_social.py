import pytest
from datetime import datetime
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock

from simple_repository.exceptions import NotFoundException

from src._types import AuthFlow, IntegrationPlatform, IntegrationType
from src.exceptions import NeedConfirmationException
from src.dto.internal.auth import PlatformAuthResult, PlatformMeta, PlatformUser, PlatformTokens
from src.models.auth_user import AuthUserSchema
from src.models.linked_accounts import LinkedAccountsDomain


@pytest.mark.asyncio
async def test_login_by_social_existing_link(auth_service, mock_db_session, mocker):
    user_id = uuid4()
    link_id = uuid4()

    # 1. Мокаем стратегию внешнего провайдера
    mock_strategy = MagicMock()
    mock_strategy.meta = PlatformMeta(
        platform=IntegrationPlatform.TWITCH,
        integration_type=IntegrationType.IDENTITY_AND_BOT,
        auth_flow=AuthFlow.AUTH_CODE,
    )

    platform_result = PlatformAuthResult(
        user=PlatformUser(
            id="twitch_123", username="twitch_user", avatar_url="url", email="user@test.com", email_verified=True
        ),
        tokens=PlatformTokens(access_token="access_123", refresh_token="refresh_123", expires_at=1700000000),
    )
    mock_strategy.fetch_identity = AsyncMock(return_value=platform_result)
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    # 2. Сценарий: СВЯЗЬ ЕСТЬ (level 1)
    existing_link = LinkedAccountsDomain(
        id=link_id,
        user_id=user_id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_123",
        platform_username="twitch_user",
        platform_avatar_url="url",
        platform_user_email="user@test.com",
        bot_connection=False,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    # Мокаем именно get_one для link_repo, который запрашивает platform_user_id
    auth_service.link_repo.get_one = AsyncMock(return_value=existing_link)
    auth_service.link_repo.update = AsyncMock(return_value=existing_link)

    existing_user = AuthUserSchema(
        id=user_id,
        username="main_user",
        email="user@test.com",
        email_confirmed=True,
        is_active=True,
        last_login=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    # Мокаем get_one для user_repo
    auth_service.user_repo.get_one = AsyncMock(return_value=existing_user)

    # Мокаем token_service.update_tokens
    mocker.patch("src.services.tokens.token_service.token_service.update_tokens", AsyncMock())
    mocker.patch.object(auth_service, "encode_jwt", return_value="mocked_jwt_token")

    # Вызов
    token = await auth_service.login_by_social(
        db_session=mock_db_session, code="valid_code", platform=IntegrationPlatform.TWITCH
    )

    # Проверки
    assert token == "mocked_jwt_token"


@pytest.mark.asyncio
async def test_login_by_social_email_collision(auth_service, mock_db_session, mocker):
    # 1. Мокаем стратегию
    mock_strategy = MagicMock()
    mock_strategy.meta = PlatformMeta(
        platform=IntegrationPlatform.TWITCH,
        integration_type=IntegrationType.IDENTITY_AND_BOT,
        auth_flow=AuthFlow.AUTH_CODE,
        allow_email_collision=False,  # Чтобы спровоцировать ошибку (или проверку NeedConfirmationException)
    )

    platform_result = PlatformAuthResult(
        user=PlatformUser(
            id="twitch_777",
            username="new_twitch_user",
            avatar_url="avatar_url",
            email="collision@test.com",
            email_verified=True,
        ),
        tokens=PlatformTokens(access_token="access_777", refresh_token="refresh_777"),
    )
    mock_strategy.fetch_identity = AsyncMock(return_value=platform_result)
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    # 2. Сценарий: Связи по ID нет (level 1 генерирует NotFoundException)
    auth_service.link_repo.get_one = AsyncMock(side_effect=NotFoundException())

    # На level 2 связь по email находится (имитируем коллизию)
    clashing_link = LinkedAccountsDomain(
        id=uuid4(),
        user_id=uuid4(),
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_old",
        platform_username="old_user",
        platform_avatar_url="url",
        platform_user_email="collision@test.com",
        bot_connection=False,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    auth_service.link_repo.get_by_email_platform = AsyncMock(return_value=clashing_link)

    # Вызов и ожидание исключения (в зависимости от вашей логики: HTTPException(400) или NeedConfirmationException)
    # Судя по трейсбеку, у вас падает именно на HTTPException(status_code=400, detail="Email collision")
    with pytest.raises(pytest.importorskip("fastapi").HTTPException) as exc_info:
        await auth_service.login_by_social(
            db_session=mock_db_session, code="valid_code", platform=IntegrationPlatform.TWITCH
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Email collision"


@pytest.mark.asyncio
async def test_login_by_social_email_confirmation(auth_service, mock_db_session, mocker):
    # 1. Мокаем стратегию
    mock_strategy = MagicMock()
    mock_strategy.meta = PlatformMeta(
        platform=IntegrationPlatform.TWITCH,
        integration_type=IntegrationType.IDENTITY_AND_BOT,
        auth_flow=AuthFlow.AUTH_CODE,
        allow_email_collision=True,  # Чтобы спровоцировать ошибку (или проверку NeedConfirmationException)
    )

    platform_result = PlatformAuthResult(
        user=PlatformUser(
            id="twitch_777",
            username="new_twitch_user",
            avatar_url="avatar_url",
            email="collision@test.com",
            email_verified=True,
        ),
        tokens=PlatformTokens(access_token="access_777", refresh_token="refresh_777"),
    )
    mock_strategy.fetch_identity = AsyncMock(return_value=platform_result)
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    # 2. Сценарий: Связи по ID нет (level 1 генерирует NotFoundException)
    auth_service.link_repo.get_one = AsyncMock(side_effect=NotFoundException())

    # На level 2 связь по email находится (имитируем коллизию)
    user_id = uuid4()
    clashing_link = LinkedAccountsDomain(
        id=uuid4(),
        user_id=user_id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_old",
        platform_username="old_user",
        platform_avatar_url="url",
        platform_user_email="collision@test.com",
        bot_connection=False,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    auth_service.link_repo.get_by_email_platform = AsyncMock(return_value=clashing_link)

    with pytest.raises(NeedConfirmationException) as exc_info:
        await auth_service.login_by_social(
            db_session=mock_db_session, code="valid_code", platform=IntegrationPlatform.TWITCH
        )

    assert exc_info.value.data["user_id"] == str(user_id)


@pytest.mark.asyncio
async def test_login_by_social_user_email_exists_level_3(auth_service, mock_db_session, mocker):
    """Level 3: Связей нет, но в системе есть пользователь с таким Email.
    Привязываем к нему и возвращаем токен."""
    user_id = uuid4()
    link_id = uuid4()

    # 1. Мокаем стратегию
    mock_strategy = MagicMock()
    mock_strategy.meta = PlatformMeta(
        platform=IntegrationPlatform.TWITCH,
        integration_type=IntegrationType.IDENTITY_AND_BOT,
        auth_flow=AuthFlow.AUTH_CODE,
    )

    platform_result = PlatformAuthResult(
        user=PlatformUser(
            id="twitch_888", username="twitch_user", avatar_url="url", email="collision@test.com", email_verified=True
        ),
        tokens=PlatformTokens(access_token="access_888", refresh_token="refresh_888", expires_at=1700000000),
    )
    mock_strategy.fetch_identity = AsyncMock(return_value=platform_result)
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    # 2. Настраиваем репозитории для Level 3
    # Проверка первого и второго уровня (связей нет)
    auth_service.link_repo.get_one = AsyncMock(side_effect=NotFoundException())
    auth_service.link_repo.get_by_email_platform = AsyncMock(side_effect=NotFoundException())

    # Находим пользователя по email
    existing_user = AuthUserSchema(
        id=user_id,
        username="existing_user",
        email="collision@test.com",
        email_confirmed=True,
        is_active=True,
        last_login=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    auth_service.user_repo.get_one = AsyncMock(return_value=existing_user)

    # Имитируем создание связи и токенов
    created_link = LinkedAccountsDomain(
        id=link_id,
        user_id=user_id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_888",
        platform_username="twitch_user",
        platform_avatar_url="url",
        platform_user_email="collision@test.com",
        bot_connection=False,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    mocker.patch.object(auth_service, "create_link", AsyncMock(return_value=created_link))
    auth_service.token_vault_repo.create = AsyncMock()

    mocker.patch.object(auth_service, "encode_jwt", return_value="jwt_level_3")

    # Вызов
    token = await auth_service.login_by_social(
        db_session=mock_db_session, code="valid_code", platform=IntegrationPlatform.TWITCH
    )

    # Проверки
    assert token == "jwt_level_3"
    auth_service.user_repo.get_one.assert_called_with(mock_db_session, "collision@test.com", column="email")
    auth_service.create_link.assert_called_once()
    auth_service.token_vault_repo.create.assert_called_once()


@pytest.mark.asyncio
async def test_login_by_social_new_user_level_4(auth_service, mock_db_session, mocker):
    """Level 4: Полностью новый пользователь. Создаем аккаунт, связь и токены."""
    new_user_id = uuid4()
    new_link_id = uuid4()

    # 1. Мокаем стратегию
    mock_strategy = MagicMock()
    mock_strategy.meta = PlatformMeta(
        platform=IntegrationPlatform.TWITCH,
        integration_type=IntegrationType.IDENTITY_AND_BOT,
        auth_flow=AuthFlow.AUTH_CODE,
    )

    platform_result = PlatformAuthResult(
        user=PlatformUser(
            id="twitch_777", username="new_user", avatar_url="url", email="new@test.com", email_verified=True
        ),
        tokens=PlatformTokens(access_token="access_777", refresh_token="refresh_777", expires_at=1700000000),
    )
    mock_strategy.fetch_identity = AsyncMock(return_value=platform_result)
    mocker.patch("src.services.auth.strategy_manager.manager.get", return_value=mock_strategy)

    # 2. Настраиваем репозитории для Level 4 (ничего нигде не найдено)
    auth_service.link_repo.get_one = AsyncMock(side_effect=NotFoundException())
    auth_service.link_repo.get_by_email_platform = AsyncMock(side_effect=NotFoundException())
    auth_service.user_repo.get_one = AsyncMock(side_effect=NotFoundException())

    # Имитируем методы создания
    created_user = AuthUserSchema(
        id=new_user_id,
        username="new_user",
        email="new@test.com",
        email_confirmed=True,
        is_active=True,
        last_login=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    created_link = LinkedAccountsDomain(
        id=new_link_id,
        user_id=new_user_id,
        platform=IntegrationPlatform.TWITCH,
        platform_user_id="twitch_777",
        platform_username="new_user",
        platform_avatar_url="url",
        platform_user_email="new@test.com",
        bot_connection=False,
        bot_settings=None,
        is_dead=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    mocker.patch.object(auth_service, "create_user", AsyncMock(return_value=created_user))
    mocker.patch.object(auth_service, "create_link", AsyncMock(return_value=created_link))
    auth_service.token_vault_repo.create = AsyncMock()

    mocker.patch.object(auth_service, "encode_jwt", return_value="jwt_level_4")

    # Вызов
    token = await auth_service.login_by_social(
        db_session=mock_db_session, code="valid_code", platform=IntegrationPlatform.TWITCH
    )

    # Проверки
    assert token == "jwt_level_4"
    auth_service.create_user.assert_called_once()
    auth_service.create_link.assert_called_once()
    auth_service.token_vault_repo.create.assert_called_once()
