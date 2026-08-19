from uuid import uuid4
from unittest.mock import AsyncMock, patch, MagicMock
import pytest

from src.services.signalr_client import refresh_access_token


@pytest.mark.asyncio
async def test_refresh_access_token_success():
    user_id = uuid4()
    platform_user_id = "p_user_1"
    refresh_token = "valid_refresh_token"

    mock_json = {
        "access_token": "new_access_token_123",
        "refresh_token": "new_refresh_token_456",
        "expires_in": 3600,
    }

    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value=mock_json)

    mock_post_context = AsyncMock()
    mock_post_context.__aenter__.return_value = mock_response

    mock_session = MagicMock()
    mock_session.post.return_value = mock_post_context
    mock_session.close = AsyncMock()

    with patch("src.services.signalr_client.rabbit_broker.publish", new_callable=AsyncMock) as mock_publish:
        result = await refresh_access_token(
            refresh_token=refresh_token,
            user_id=user_id,
            platform_user_id=platform_user_id,
            session=mock_session,
        )

        assert result == mock_json
        assert mock_publish.await_count == 1
        published_dto = mock_publish.await_args[0][0]
        assert published_dto.user_id == user_id
        assert published_dto.access_token == "new_access_token_123"
        assert published_dto.refresh_token == "new_refresh_token_456"


@pytest.mark.asyncio
async def test_refresh_access_token_failure():
    user_id = uuid4()
    platform_user_id = "p_user_1"
    refresh_token = "invalid_refresh_token"

    mock_response = MagicMock()
    mock_response.status = 401
    mock_response.text = AsyncMock(return_value="Unauthorized")

    mock_post_context = AsyncMock()
    mock_post_context.__aenter__.return_value = mock_response

    mock_session = MagicMock()
    mock_session.post.return_value = mock_post_context
    mock_session.close = AsyncMock()

    with patch("src.services.signalr_client.rabbit_broker.publish", new_callable=AsyncMock) as mock_publish:
        result = await refresh_access_token(
            refresh_token=refresh_token,
            user_id=user_id,
            platform_user_id=platform_user_id,
            session=mock_session,
        )

        assert result is None
        assert mock_publish.await_count == 1
        payload = mock_publish.await_args[0][0]
        assert payload["refresh_token"] == "invalid_refresh_token"
        assert payload["platform_user_id"] == "p_user_1"
