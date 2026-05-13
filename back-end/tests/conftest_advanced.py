"""
Pytest configuration and utilities for comprehensive testing.

This module provides:
- pytest configuration
- Common test utilities
- Fixtures available to all tests
- Custom markers for test organization
"""

import pytest
import sys
from pathlib import Path

# Add source to path for imports
src_path = Path(__file__).parent.parent.parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))


# ==================== PYTEST CONFIGURATION ====================


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async (run with asyncio event loop)"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "unit: mark test as unit test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "external_api: mark test requiring external API (deselect with '-m \"not external_api\"')"
    )


# ==================== SESSION FIXTURES ====================


@pytest.fixture(scope="session")
def event_loop_policy():
    """Provide event loop policy for async tests."""
    import asyncio
    return asyncio.get_event_loop_policy()


@pytest.fixture(scope="session")
def anyio_backend():
    """Configure anyio backend for async tests."""
    return "asyncio"


# ==================== SHARED TEST DATA ====================


@pytest.fixture
def test_ids():
    """Provides commonly used test IDs."""
    from uuid import UUID
    return {
        "user_id": UUID("550e8400-e29b-41d4-a716-446655440000"),
        "twitch_user_id": "123456789",
        "da_user_id": "987654321",
        "playlist_id": UUID("660e8400-e29b-41d4-a716-446655440001"),
    }


@pytest.fixture
def test_credentials():
    """Provides test credentials."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "TestPassword123!",
        "twitch_oauth_code": "auth_code_123",
        "da_oauth_code": "da_auth_code_456",
    }


@pytest.fixture
def test_urls():
    """Provides test URLs."""
    return {
        "twitch_oauth": "https://id.twitch.tv/oauth2/authorize",
        "twitch_api": "https://api.twitch.tv/helix",
        "da_api": "https://api.da.example.com",
    }


# ==================== LOGGING ====================


@pytest.fixture
def caplog_debug(caplog):
    """Setup caplog for debug level."""
    import logging
    caplog.set_level(logging.DEBUG)
    return caplog


# ==================== ASSERTION HELPERS ====================


class AssertionHelpers:
    """Helper methods for common assertions."""

    @staticmethod
    def assert_jwt_token_valid(token: str) -> dict:
        """
        Assert that token is a valid JWT and return decoded payload.
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded JWT payload
        """
        import jwt
        assert isinstance(token, str), "Token must be a string"
        assert len(token) > 0, "Token cannot be empty"
        
        parts = token.split(".")
        assert len(parts) == 3, "Token must have 3 parts (header.payload.signature)"
        
        decoded = jwt.decode(token, options={"verify_signature": False})
        assert "sub" in decoded, "Token must contain 'sub' claim"
        assert "username" in decoded, "Token must contain 'username' claim"
        assert "exp" in decoded, "Token must contain 'exp' claim"
        
        return decoded

    @staticmethod
    def assert_http_exception(exc_info, status_code: int, detail_contains: str = None):
        """
        Assert HTTP exception properties.
        
        Args:
            exc_info: pytest exc_info from pytest.raises context
            status_code: Expected HTTP status code
            detail_contains: Optional string that detail should contain
        """
        from fastapi import HTTPException
        
        assert isinstance(exc_info.value, HTTPException)
        assert exc_info.value.status_code == status_code
        
        if detail_contains:
            assert detail_contains in str(exc_info.value.detail)

    @staticmethod
    def assert_mock_called_with_type(mock, *arg_types, **kwarg_types):
        """
        Assert mock was called with arguments of specific types.
        
        Args:
            mock: Mock object
            *arg_types: Types for positional arguments
            **kwarg_types: Types for keyword arguments
        """
        assert mock.called, "Mock was not called"
        
        call_args = mock.call_args
        args = call_args[0] if call_args else ()
        kwargs = call_args[1] if call_args else {}
        
        for i, expected_type in enumerate(arg_types):
            assert i < len(args), f"Expected arg at position {i}"
            assert isinstance(args[i], expected_type), \
                f"Arg {i} should be {expected_type}, got {type(args[i])}"
        
        for key, expected_type in kwarg_types.items():
            assert key in kwargs, f"Expected keyword arg '{key}'"
            assert isinstance(kwargs[key], expected_type), \
                f"Kwarg '{key}' should be {expected_type}, got {type(kwargs[key])}"


@pytest.fixture
def assertion_helpers():
    """Provide assertion helpers to tests."""
    return AssertionHelpers()
