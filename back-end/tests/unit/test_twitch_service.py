"""
Comprehensive unit tests for AuthTwitchService.

Tests cover:
- OAuth token exchange
- Token refresh
- Token validation
- User data retrieval
- Error handling and edge cases
"""

import pytest
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
import httpx

if TYPE_CHECKING:
    from src.services.auth.twitch_service import AuthTwitchService
    from src.dto.internal.twitch import TwitchAuthResponse, TwitchUserResponse
    from src.dto.internal.auth import PlatformUser
    from src._types import Platform
else:
    from services.auth.twitch_service import AuthTwitchService
    from dto.internal.twitch import TwitchAuthResponse, TwitchUserResponse
    from dto.internal.auth import PlatformUser
    from _types import Platform

# ==================== FIXTURES ====================


@pytest.fixture
def mock_rabbit_queue():
    """Mock RabbitMQ queue."""
    return MagicMock()


@pytest.fixture
def twitch_service(mock_rabbit_queue):
    """Create AuthTwitchService instance with mocked queue."""
    return AuthTwitchService(mock_rabbit_queue)


@pytest.fixture
def mock_twitch_auth_response():
    """Create mock Twitch OAuth response."""
    response = MagicMock(spec=TwitchAuthResponse)
    response.access_token = "test_access_token"
    response.refresh_token = "test_refresh_token"
    response.expires_in = 3600
    response.token_type = "Bearer"
    return response


@pytest.fixture
def mock_twitch_user_response():
    """Create mock Twitch user data response."""
    response = MagicMock(spec=TwitchUserResponse)
    response.id = "123456789"
    response.login = "teststreamer"
    response.display_name = "TestStreamer"
    response.email = "streamer@example.com"
    response.email_verified = True
    response.type = "user"
    response.broadcaster_type = "partner"
    response.description = "Test streamer"
    response.profile_image_url = "https://example.com/avatar.jpg"
    response.offline_image_url = "https://example.com/offline.jpg"
    response.view_count = 1000
    response.created_at = "2020-01-01T00:00:00Z"
    return response


# ==================== CONFIGURATION TESTS ====================


class TestTwitchServiceConfiguration:
    """Tests for Twitch service configuration."""

    def test_allow_email_collision_returns_true(self, twitch_service):
        """
        GIVEN: Twitch service instance
        WHEN: allow_email_collision is called
        THEN: Returns True (Twitch allows email collisions)
        """
        # Act
        result = twitch_service.allow_email_collision()

        # Assert
        assert result is True

    def test_bot_queue_is_initialized(self, twitch_service, mock_rabbit_queue):
        """
        GIVEN: Twitch service instance
        WHEN: Service is initialized
        THEN: Bot queue is stored
        """
        # Assert
        assert twitch_service.bot_connect_request_queue == mock_rabbit_queue


# ==================== TOKEN EXCHANGE TESTS ====================


class TestGetToken:
    """Tests for OAuth token exchange."""

    @patch("services.auth.twitch_service.httpx.post")
    def test_get_token_success(self, mock_post, twitch_service):
        """
        GIVEN: Valid authorization code
        WHEN: get_token is called
        THEN: TwitchAuthResponse is returned
        """
        # Arrange
        code = "auth_code_123"
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "token_123",
            "refresh_token": "refresh_123",
            "expires_in": 3600,
            "token_type": "Bearer",
        }
        mock_post.return_value = mock_response

        # Act
        result = twitch_service.get_token(code)

        # Assert
        assert result.access_token == "token_123"
        assert result.refresh_token == "refresh_123"
        assert result.expires_in == 3600

    @patch("services.auth.twitch_service.httpx.post")
    def test_get_token_handles_error_response(self, mock_post, twitch_service):
        """
        GIVEN: Invalid authorization code
        WHEN: get_token is called
        THEN: HTTPException is raised
        """
        # Arrange
        code = "invalid_code"
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Invalid authorization code"
        mock_post.return_value = mock_response

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            twitch_service.get_token(code)

        assert exc_info.value.status_code == 400

    @patch("services.auth.twitch_service.httpx.post")
    def test_get_token_sends_correct_parameters(self, mock_post, twitch_service):
        """
        GIVEN: Valid authorization code
        WHEN: get_token is called
        THEN: Correct OAuth parameters are sent to Twitch
        """
        # Arrange
        code = "auth_code_123"
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "token",
            "refresh_token": "refresh",
            "expires_in": 3600,
            "token_type": "Bearer",
        }
        mock_post.return_value = mock_response

        # Act
        twitch_service.get_token(code)

        # Assert
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert "oauth2/token" in call_args[0][0]
        assert call_args[1]["data"]["code"] == code
        assert call_args[1]["data"]["grant_type"] == "authorization_code"


# ==================== TOKEN REFRESH TESTS ====================


class TestRefreshToken:
    """Tests for token refresh."""

    @pytest.mark.asyncio
    @patch("services.auth.twitch_service.httpx.post")
    async def test_refresh_token_success(self, mock_post, twitch_service):
        """
        GIVEN: Valid refresh token
        WHEN: refresh_token is called
        THEN: New TwitchAuthResponse is returned
        """
        # Arrange
        refresh_token = "refresh_123"
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "new_token",
            "refresh_token": "new_refresh",
            "expires_in": 3600,
            "token_type": "Bearer",
        }
        mock_post.return_value = mock_response

        # Act
        result = await twitch_service.refresh_token(refresh_token)

        # Assert
        assert result.access_token == "new_token"
        assert result.refresh_token == "new_refresh"

    @pytest.mark.asyncio
    @patch("services.auth.twitch_service.httpx.post")
    async def test_refresh_token_handles_error(self, mock_post, twitch_service):
        """
        GIVEN: Invalid refresh token
        WHEN: refresh_token is called
        THEN: HTTPException is raised
        """
        # Arrange
        refresh_token = "invalid_refresh"
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Invalid refresh token"
        mock_post.return_value = mock_response

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await twitch_service.refresh_token(refresh_token)

        assert exc_info.value.status_code == 400


# ==================== TOKEN VALIDATION TESTS ====================


class TestValidateToken:
    """Tests for token validation."""

    @patch("services.auth.twitch_service.httpx.post")
    def test_validate_token_success(self, mock_post, twitch_service):
        """
        GIVEN: Valid access token
        WHEN: validate_token is called
        THEN: Returns True
        """
        # Arrange
        tokens = MagicMock()
        tokens.access_token = "valid_token"
        tokens.token_type = "Bearer"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        # Act
        result = twitch_service.validate_token(tokens)

        # Assert
        assert result is True

    @patch("services.auth.twitch_service.httpx.post")
    def test_validate_token_invalid(self, mock_post, twitch_service):
        """
        GIVEN: Invalid access token
        WHEN: validate_token is called
        THEN: Returns False
        """
        # Arrange
        tokens = MagicMock()
        tokens.access_token = "invalid_token"
        tokens.token_type = "Bearer"

        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_post.return_value = mock_response

        # Act
        result = twitch_service.validate_token(tokens)

        # Assert
        assert result is False


# ==================== USER DATA RETRIEVAL TESTS ====================


class TestGetData:
    """Tests for user data retrieval."""

    @patch("services.auth.twitch_service.httpx.get")
    def test_get_data_success(self, mock_get, twitch_service):
        """
        GIVEN: Valid access token
        WHEN: get_data is called
        THEN: TwitchUserResponse is returned
        """
        # Arrange
        access_token = "token_123"
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "id": "123456",
                    "login": "teststreamer",
                    "display_name": "TestStreamer",
                    "email": "streamer@example.com",
                    "email_verified": True,
                    "type": "user",
                    "broadcaster_type": "partner",
                    "description": "Test streamer",
                    "profile_image_url": "https://example.com/avatar.jpg",
                    "offline_image_url": "https://example.com/offline.jpg",
                    "view_count": 1000,
                    "created_at": "2020-01-01T00:00:00Z",
                }
            ]
        }
        mock_get.return_value = mock_response

        # Act
        result = twitch_service.get_data(access_token)

        # Assert
        assert result.id == "123456"
        assert result.display_name == "TestStreamer"
        assert result.email == "streamer@example.com"
        assert result.email_verified is True

    @patch("services.auth.twitch_service.httpx.get")
    def test_get_data_handles_missing_email(self, mock_get, twitch_service):
        """
        GIVEN: User with no email
        WHEN: get_data is called
        THEN: Email is set to empty string and email_verified to False
        """
        # Arrange
        access_token = "token_123"
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "id": "123456",
                    "login": "teststreamer",
                    "display_name": "TestStreamer",
                    "type": "user",
                    "broadcaster_type": "affiliate",
                    "description": "Test",
                    "profile_image_url": "https://example.com/avatar.jpg",
                    "offline_image_url": "https://example.com/offline.jpg",
                    "view_count": 100,
                    "created_at": "2020-01-01T00:00:00Z",
                }
            ]
        }
        mock_get.return_value = mock_response

        # Act
        result = twitch_service.get_data(access_token)

        # Assert
        assert result.email == ""
        assert result.email_verified is False

    @patch("services.auth.twitch_service.httpx.get")
    def test_get_data_error_response(self, mock_get, twitch_service):
        """
        GIVEN: API error response
        WHEN: get_data is called
        THEN: HTTPException is raised
        """
        # Arrange
        access_token = "invalid_token"
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        mock_get.return_value = mock_response

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            twitch_service.get_data(access_token)

        assert exc_info.value.status_code == 400


# ==================== IDENTITY FETCH TESTS ====================


class TestFetchIdentity:
    """Tests for complete identity fetch flow."""

    @pytest.mark.asyncio
    @patch("services.auth.twitch_service.AuthTwitchService.get_token")
    @patch("services.auth.twitch_service.AuthTwitchService.get_data")
    async def test_fetch_identity_success(
        self,
        mock_get_data,
        mock_get_token,
        twitch_service,
        mock_twitch_auth_response,
        mock_twitch_user_response,
    ):
        """
        GIVEN: Valid authorization code
        WHEN: fetch_identity is called
        THEN: PlatformUser dict is returned with all data
        """
        # Arrange
        code = "auth_code_123"
        mock_get_token.return_value = mock_twitch_auth_response
        mock_get_data.return_value = mock_twitch_user_response

        # Act
        result = await twitch_service.fetch_identity(code)

        # Assert
        assert result is not None
        assert isinstance(result, dict)  # PlatformUser is a TypedDict
        assert result["id"] == "123456789"
        assert result["username"] == "TestStreamer"


# ==================== PARAMETRIZED TESTS ====================


class TestTwitchServiceParametrized:
    """Parametrized tests for Twitch service."""

    @pytest.mark.parametrize(
        "email,email_verified",
        [
            ("user@example.com", True),
            ("user.name@example.co.uk", True),
            ("", False),
            (None, False),
        ],
    )
    @patch("services.auth.twitch_service.httpx.get")
    def test_get_data_with_various_email_states(
        self,
        mock_get,
        twitch_service,
        email,
        email_verified,
    ):
        """
        GIVEN: Various email states from Twitch API
        WHEN: get_data is called
        THEN: Email fields are correctly handled
        """
        # Arrange
        user_data = {
            "id": "123456",
            "login": "teststreamer",
            "display_name": "TestStreamer",
            "type": "user",
            "broadcaster_type": "affiliate",
            "description": "Test",
            "profile_image_url": "https://example.com/avatar.jpg",
            "offline_image_url": "https://example.com/offline.jpg",
            "view_count": 100,
            "created_at": "2020-01-01T00:00:00Z",
        }
        if email is not None:
            user_data["email"] = email

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": [user_data]}
        mock_get.return_value = mock_response

        # Act
        result = twitch_service.get_data("token")

        # Assert
        assert result.email_verified == email_verified
