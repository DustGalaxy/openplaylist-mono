from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from src._types import IntegrationPlatform
from src.models.linked_accounts import LinkedAccountsDomain


@pytest.mark.asyncio
async def test_bot_was_disconnected_integration_not_found(auth_service, mock_db_session):
    """Ошибка 400: Интеграция с указанными платформой и ID не найдена в репозитории."""
    auth_service.link_repo.get_by_id_platform = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.bot_was_disconnected(mock_db_session, IntegrationPlatform.TWITCH, "twitch_123")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Integration not found"
    auth_service.link_repo.get_by_id_platform.assert_called_once_with(
        mock_db_session, platform=IntegrationPlatform.TWITCH, platform_user_id="twitch_123"
    )


@pytest.mark.asyncio
async def test_bot_was_disconnected_success(auth_service, mock_db_session):
    """Успех: Интеграция найдена, bot_connection -> False, is_dead -> True, данные сохранены."""
    platform_user_id = "twitch_123"

    integration = LinkedAccountsDomain(
        id=uuid4(),
        user_id=uuid4(),
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

    auth_service.link_repo.get_by_id_platform = AsyncMock(return_value=integration)
    auth_service.link_repo.update = AsyncMock()

    result = await auth_service.bot_was_disconnected(mock_db_session, IntegrationPlatform.TWITCH, platform_user_id)

    # Проверки
    assert result == integration
    assert integration.bot_connection is False
    assert integration.is_dead is True

    auth_service.link_repo.get_by_id_platform.assert_called_once_with(
        mock_db_session, platform=IntegrationPlatform.TWITCH, platform_user_id=platform_user_id
    )
    auth_service.link_repo.update.assert_called_once_with(mock_db_session, integration)
