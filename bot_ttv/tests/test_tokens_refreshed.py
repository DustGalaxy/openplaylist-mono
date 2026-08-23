import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.adapters._rabbit.dto.user import Tokens, TwitchBotSettings
from src.adapters._rabbit.handlers import context, tokens_refreshed


def test_tokens_dto_full_fields():
    payload = {
        "user_id": "019ec26d-7688-7f9a-9e12-pm32ew3zx1vh",
        "platform": "twitch",
        "platform_user_id": "12345678",
        "access_token": "oauth_access_token_123",
        "refresh_token": "oauth_refresh_token_456",
        "expires_at": 1700000000,
        "bot_settings": {"prefix": "!"},
    }
    event = Tokens.model_validate(payload)
    assert event.user_id == "019ec26d-7688-7f9a-9e12-pm32ew3zx1vh"
    assert event.platform == "twitch"
    assert event.platform_user_id == "12345678"
    assert event.access_token == "oauth_access_token_123"
    assert event.refresh_token == "oauth_refresh_token_456"
    assert event.expires_at == 1700000000
    assert event.bot_settings.prefix == "!"


def test_tokens_dto_with_null_bot_settings():
    payload = {
        "user_id": "019ec26d-7688-7f9a-9e12-pm32ew3zx1vh",
        "platform": "twitch",
        "platform_user_id": "12345678",
        "access_token": "oauth_access_token_123",
        "refresh_token": "oauth_refresh_token_456",
        "expires_at": 1700000000,
        "bot_settings": None,
    }
    event = Tokens.model_validate(payload)
    assert event.bot_settings.prefix == "::"


def test_tokens_dto_with_missing_optional_fields():
    payload = {
        "user_id": "019ec26d-7688-7f9a-9e12-pm32ew3zx1vh",
        "platform": "twitch",
        "platform_user_id": "12345678",
        "access_token": "oauth_access_token_123",
    }
    event = Tokens.model_validate(payload)
    assert event.refresh_token == ""
    assert event.expires_at == 0
    assert isinstance(event.bot_settings, TwitchBotSettings)
    assert event.bot_settings.prefix == "::"


@pytest.mark.asyncio
async def test_tokens_refreshed_handler_success():
    mock_bot = MagicMock()
    mock_bot.add_token = AsyncMock()
    context["bot"] = mock_bot

    message_payload = {
        "user_id": "u-123",
        "platform": "twitch",
        "platform_user_id": "p-456",
        "access_token": "new_access",
        "refresh_token": "new_refresh",
        "expires_at": 1700000000,
        "bot_settings": {"prefix": "?"},
    }

    mock_msg = MagicMock()
    mock_msg.ack = AsyncMock()
    mock_msg.body = json.dumps(message_payload).encode("utf-8")

    await tokens_refreshed(mock_msg)

    mock_msg.ack.assert_awaited_once()
    mock_bot.add_token.assert_awaited_once()
    call_args = mock_bot.add_token.call_args[0]
    assert call_args[0] == "new_access"
    assert call_args[1] == "new_refresh"
    assert isinstance(call_args[2], Tokens)
    assert call_args[2].bot_settings.prefix == "?"


@pytest.mark.asyncio
async def test_tokens_refreshed_handler_handles_error_gracefully():
    mock_bot = MagicMock()
    mock_bot.add_token = AsyncMock(side_effect=Exception("Twitch API error"))
    context["bot"] = mock_bot

    mock_msg = MagicMock()
    mock_msg.ack = AsyncMock()
    mock_msg.body = b"invalid json content"

    # Should not raise exception
    await tokens_refreshed(mock_msg)

    mock_msg.ack.assert_awaited_once()
