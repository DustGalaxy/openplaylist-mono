"""
Comprehensive unit tests for AuthDAService.

Tests cover:
- OAuth token exchange
- Token refresh
- User data retrieval
- API request handling
- Error handling (HTTP errors, network errors, JSON errors)
- Email collision policy
"""

from typing import TYPE_CHECKING
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
import httpx
import json
from datetime import datetime

if TYPE_CHECKING:
    from src.services.auth.da_service import AuthDAService
    from src.dto.internal.da import DAToken, DAUser
    from src.dto.internal.auth import PlatformUser
else:
    from services.auth.da_service import AuthDAService
    from dto.internal.da import DAToken
    from dto.internal.auth import PlatformUser

# ==================== FIXTURES ====================


@pytest.fixture
def mock_rabbit_queue():
    """Mock RabbitMQ queue."""
    return MagicMock()


@pytest.fixture
def da_service(mock_rabbit_queue):
    """Create AuthDAService instance with mocked queue."""
    return AuthDAService(mock_rabbit_queue)


@pytest.fixture
def mock_da_token():
    """Create mock DA token response."""
    token = MagicMock(spec=DAToken)
    token.access_token = "test_access_token"
    token.refresh_token = "test_refresh_token"
    token.expires_in = 3600
    token.expires_at = 1234567890
    token.token_type = "Bearer"
    return token


@pytest.fixture
def mock_da_user():
    """Create mock DA user response."""
    user = MagicMock(spec=DAUser)
    user.id = "da_user_123"
    user.code = "user_code"
    user.name = "Test User"
    user.avatar = "https://example.com/avatar.jpg"
    user.email = "user@example.com"
    user.language = "en"
    user.socket_connection_token = "socket_token_123"
    return user


# ==================== CONFIGURATION TESTS ====================


class TestDAServiceConfiguration:
    """Tests for DA service configuration."""

    def test_allow_email_collision_returns_false(self, da_service):
        """
        GIVEN: DA service instance
        WHEN: allow_email_collision is called
        THEN: Returns False (DA doesn't allow email collisions)
        """
        # Act
        result = da_service.allow_email_collision()

        # Assert
        assert result is False

    def test_bot_queue_is_initialized(self, da_service, mock_rabbit_queue):
        """
        GIVEN: DA service instance
        WHEN: Service is initialized
        THEN: Bot queue is stored
        """
        # Assert
        assert da_service.bot_connect_request_queue == mock_rabbit_queue


# ==================== API REQUEST HELPER TESTS ====================


class TestMakeAPIRequest:
    """Tests for the _make_api_request helper method."""

    @pytest.mark.asyncio
    @patch("services.auth.da_service.httpx.AsyncClient")
    async def test_make_api_request_success(self, mock_client_class, da_service):
        """
        GIVEN: Valid API request parameters
        WHEN: _make_api_request is called
        THEN: JSON response is returned
        """
        # Arrange
        mock_response = MagicMock()
        mock_response.json.return_value = {"data": "test_data"}
        mock_response.content = b'{"data": "test_data"}'

        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        # Act
        result = await da_service._make_api_request("GET", "/user", "token_123")

        # Assert
        assert result == {"data": "test_data"}
        mock_client.request.assert_called_once()

    @pytest.mark.asyncio
    @patch("services.auth.da_service.httpx.AsyncClient")
    async def test_make_api_request_handles_http_error(self, mock_client_class, da_service):
        """
        GIVEN: API returns HTTP error
        WHEN: _make_api_request is called
        THEN: HTTPException is raised
        """
        # Arrange
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"

        mock_client = AsyncMock()
        mock_client.request = AsyncMock(
            side_effect=httpx.HTTPStatusError("401", request=MagicMock(), response=mock_response)
        )
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await da_service._make_api_request("GET", "/user", "invalid_token")

        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    @patch("services.auth.da_service.httpx.AsyncClient")
    async def test_make_api_request_handles_network_error(self, mock_client_class, da_service):
        """
        GIVEN: Network error occurs
        WHEN: _make_api_request is called
        THEN: HTTPException is raised
        """
        # Arrange
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(side_effect=httpx.RequestError("Connection failed"))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await da_service._make_api_request("GET", "/user", "token_123")

        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    @patch("services.auth.da_service.httpx.AsyncClient")
    async def test_make_api_request_handles_json_decode_error(self, mock_client_class, da_service):
        """
        GIVEN: API returns invalid JSON
        WHEN: _make_api_request is called
        THEN: HTTPException is raised
        """
        # Arrange
        mock_response = MagicMock()
        mock_response.content = b"invalid json"
        mock_response.text = "invalid json"
        mock_response.json.side_effect = json.JSONDecodeError("msg", "doc", 0)

        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await da_service._make_api_request("GET", "/user", "token_123")

        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    @patch("services.auth.da_service.httpx.AsyncClient")
    async def test_make_api_request_handles_empty_response(self, mock_client_class, da_service):
        """
        GIVEN: API returns empty response
        WHEN: _make_api_request is called
        THEN: HTTPException is raised
        """
        # Arrange
        mock_response = MagicMock()
        mock_response.content = b""

        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await da_service._make_api_request("GET", "/user", "token_123")

        assert exc_info.value.status_code == 400


# ==================== TOKEN EXCHANGE TESTS ====================


class TestGetToken:
    """Tests for OAuth token exchange."""

    @pytest.mark.asyncio
    @patch("services.auth.da_service.datetime")
    @patch("services.auth.da_service.httpx.AsyncClient")
    async def test_get_token_success(self, mock_client_class, mock_datetime, da_service):
        """
        GIVEN: Valid authorization code
        WHEN: get_token is called
        THEN: DAToken is returned
        """
        # Arrange
        code = "auth_code_123"
        mock_now = MagicMock()
        mock_now.timestamp.return_value = 1000
        mock_datetime.now.return_value = mock_now
        mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw) if args else mock_datetime

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "token_123",
            "refresh_token": "refresh_123",
            "expires_in": 3600,
            "token_type": "Bearer",
        }

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        # Act
        result = await da_service.get_token(code)

        # Assert
        assert result.access_token == "token_123"
        assert result.refresh_token == "refresh_123"
        assert result.expires_in == 3600

    @pytest.mark.asyncio
    @patch("services.auth.da_service.httpx.AsyncClient")
    async def test_get_token_error_response(self, mock_client_class, da_service):
        """
        GIVEN: Invalid authorization code
        WHEN: get_token is called
        THEN: Exception is raised
        """
        # Arrange
        code = "invalid_code"
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "400", request=MagicMock(), response=mock_response
        )

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        # Act & Assert
        with pytest.raises(httpx.HTTPStatusError):
            await da_service.get_token(code)


# ==================== USER DATA RETRIEVAL TESTS ====================


class TestGetData:
    """Tests for user data retrieval."""

    @pytest.mark.asyncio
    @patch("services.auth.da_service.AuthDAService._make_api_request")
    async def test_get_data_success(self, mock_api_request, da_service):
        """
        GIVEN: Valid access token
        WHEN: get_data is called
        THEN: DAUser is returned
        """
        # Arrange
        mock_api_request.return_value = {
            "data": {
                "id": 123,
                "code": "user_code",
                "name": "Test User",
                "avatar": "https://example.com/avatar.jpg",
                "email": "user@example.com",
                "language": "en",
                "socket_connection_token": "socket_token",
            }
        }

        # Act
        result = await da_service.get_data("token_123")

        # Assert
        assert result.id == "123"  # Converted to string
        assert result.name == "Test User"
        assert result.email == "user@example.com"
        assert result.socket_connection_token == "socket_token"

    @pytest.mark.asyncio
    @patch("services.auth.da_service.AuthDAService._make_api_request")
    async def test_get_data_api_error(self, mock_api_request, da_service):
        """
        GIVEN: API returns error
        WHEN: get_data is called
        THEN: Exception is raised
        """
        # Arrange
        mock_api_request.side_effect = HTTPException(status_code=400)

        # Act & Assert
        with pytest.raises(HTTPException):
            await da_service.get_data("invalid_token")


# ==================== TOKEN REFRESH TESTS ====================


class TestRefreshToken:
    """Tests for token refresh."""

    @pytest.mark.asyncio
    @patch("services.auth.da_service.datetime")
    @patch("services.auth.da_service.httpx.AsyncClient")
    async def test_refresh_token_success(self, mock_client_class, mock_datetime, da_service):
        """
        GIVEN: Valid refresh token
        WHEN: refresh_token is called
        THEN: New DAToken is returned
        """
        # Arrange
        refresh_token = "refresh_123"
        mock_now = MagicMock()
        mock_now.timestamp.return_value = 1000
        mock_datetime.now.return_value = mock_now
        mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw) if args else mock_datetime

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_token",
            "refresh_token": "new_refresh",
            "expires_in": 3600,
            "expires_at": 3600,
            "token_type": "Bearer",
        }

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        # Act
        result = await da_service.refresh_token(refresh_token)

        # Assert
        assert result.access_token == "new_token"
        assert result.refresh_token == "new_refresh"

    @pytest.mark.asyncio
    @patch("services.auth.da_service.datetime")
    @patch("services.auth.da_service.httpx.AsyncClient")
    async def test_refresh_token_without_new_refresh_token(self, mock_client_class, mock_datetime, da_service):
        """
        GIVEN: API doesn't return new refresh token
        WHEN: refresh_token is called
        THEN: Response is handled correctly
        """
        # Arrange
        refresh_token = "refresh_123"
        mock_now = MagicMock()
        mock_now.timestamp.return_value = 1000
        mock_datetime.now.return_value = mock_now
        mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw) if args else mock_datetime

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_token",
            "refresh_token": None,
            "expires_at": 3600,
            "expires_in": 3600,
            "token_type": "Bearer",
        }

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        # Act
        result = await da_service.refresh_token(refresh_token)

        # Assert
        assert result.access_token == "new_token"


# ==================== PARAMETRIZED TESTS ====================


class TestDAServiceParametrized:
    """Parametrized tests for DA service."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "method,endpoint",
        [
            ("GET", "/user/oauth"),
            ("POST", "/user/update"),
            ("GET", "/user/data"),
        ],
    )
    @patch("services.auth.da_service.httpx.AsyncClient")
    async def test_make_api_request_various_methods(
        self,
        mock_client_class,
        da_service,
        method,
        endpoint,
    ):
        """
        GIVEN: Various HTTP methods and endpoints
        WHEN: _make_api_request is called
        THEN: Correct method and endpoint are used
        """
        # Arrange
        mock_response = MagicMock()
        mock_response.json.return_value = {"status": "ok"}
        mock_response.content = b'{"status": "ok"}'

        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        # Act
        result = await da_service._make_api_request(method, endpoint, "token")

        # Assert
        assert result == {"status": "ok"}
        mock_client.request.assert_called_once()
        call_args = mock_client.request.call_args
        assert call_args[0][0] == method
