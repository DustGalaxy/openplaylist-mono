from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
import pytest
import httpx

from api.da_api import DonationAlertsApiClient


@pytest.mark.asyncio
async def test_get_user_info_success():
    client = DonationAlertsApiClient()
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": {
            "id": 123456,
            "name": "streamer",
            "socket_connection_token": "mock_socket_token",
        }
    }

    mock_http_client = AsyncMock(spec=httpx.AsyncClient)
    mock_http_client.get.return_value = mock_response

    result = await client.get_user_info("access_tok_123", client=mock_http_client)
    assert result == {
        "user_id": "123456",
        "socket_connection_token": "mock_socket_token",
    }


@pytest.mark.asyncio
async def test_get_subscription_token_success():
    client = DonationAlertsApiClient()
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "channels": [
            {
                "channel": "$alerts:donation_123456",
                "token": "sub_token_xyz",
            }
        ]
    }

    mock_http_client = AsyncMock(spec=httpx.AsyncClient)
    mock_http_client.post.return_value = mock_response

    result = await client.get_subscription_token(
        access_token="access_tok_123",
        client_id="client_xyz",
        channel_name="$alerts:donation_123456",
        client=mock_http_client,
    )
    assert result == "sub_token_xyz"


@pytest.mark.asyncio
async def test_refresh_token_success():
    client = DonationAlertsApiClient()
    user_id = uuid4()
    platform_user_id = "da_user_123"
    refresh_token = "valid_refresh_token"

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "access_token": "new_access_123",
        "refresh_token": "new_refresh_123",
        "expires_in": 86400,
    }

    mock_http_client = AsyncMock(spec=httpx.AsyncClient)
    mock_http_client.post.return_value = mock_response

    with patch("api.da_api.rabbit_broker.publish", new_callable=AsyncMock) as mock_publish:
        result = await client.refresh_token(
            refresh_token=refresh_token,
            user_id=user_id,
            platform_user_id=platform_user_id,
            client=mock_http_client,
        )

        assert result is not None
        assert result["access_token"] == "new_access_123"
        assert result["refresh_token"] == "new_refresh_123"
        assert mock_publish.await_count == 1


@pytest.mark.asyncio
async def test_refresh_token_failure_publishes_token_died():
    client = DonationAlertsApiClient()
    user_id = uuid4()
    platform_user_id = "da_user_123"
    refresh_token = "revoked_token"

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 400
    mock_response.text = "Bad Request"

    mock_http_client = AsyncMock(spec=httpx.AsyncClient)
    mock_http_client.post.return_value = mock_response

    with patch("api.da_api.rabbit_broker.publish", new_callable=AsyncMock) as mock_publish:
        result = await client.refresh_token(
            refresh_token=refresh_token,
            user_id=user_id,
            platform_user_id=platform_user_id,
            client=mock_http_client,
        )

        assert result is None
        assert mock_publish.await_count == 1
