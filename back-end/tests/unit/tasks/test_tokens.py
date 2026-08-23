"""Tests for src/tasks/tokens.py"""

from unittest.mock import AsyncMock, MagicMock

import pytest


def _make_token(platform="twitch", user_id="u1", platform_user_id="p1", bot_settings=None):
    token = MagicMock()
    token.linked_account.user_id = user_id
    token.linked_account.platform_user_id = platform_user_id
    token.linked_account.platform = platform
    token.linked_account.bot_settings = bot_settings
    return token


@pytest.mark.asyncio
async def test_refresh_tokens_empty(mocker):
    """Нет токенов для обновления — ни refresh_token ни publish не вызываются."""
    mock_session = AsyncMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mocker.patch("src.tasks.tokens.async_session_maker", return_value=mock_cm)

    mock_token_service = mocker.patch("src.tasks.tokens.token_service")
    mock_token_service.fetch_tokens_to_refresh = AsyncMock(return_value=[])
    mock_token_service.refresh_token = AsyncMock()

    mock_broker = mocker.patch("src.tasks.tokens.main_publisher")
    mock_broker.publish = AsyncMock()

    mocker.patch("src.tasks.tokens.asyncio.sleep", new_callable=AsyncMock)

    from src.tasks.tokens import refresh_tokens

    await refresh_tokens()

    mock_token_service.refresh_token.assert_not_called()
    mock_broker.publish.assert_not_called()


@pytest.mark.asyncio
async def test_refresh_tokens_publishes_for_each_token(mocker):
    """Для каждого токена → refresh_token вызван + publish с правильными полями."""
    tokens = [_make_token("twitch", "u1", "p1", {"prefix": "!"}), _make_token("da", "u2", "p2", None)]
    fresh = [
        MagicMock(access_token="at1", refresh_token="rt1", expires_at=1700000000),
        MagicMock(access_token="at2", refresh_token="rt2", expires_at=1700003600),
    ]

    mock_session = AsyncMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mocker.patch("src.tasks.tokens.async_session_maker", return_value=mock_cm)

    mock_token_service = mocker.patch("src.tasks.tokens.token_service")
    mock_token_service.fetch_tokens_to_refresh = AsyncMock(return_value=tokens)
    mock_token_service.refresh_token = AsyncMock(side_effect=fresh)

    mock_broker = mocker.patch("src.tasks.tokens.main_publisher")
    mock_broker.publish = AsyncMock()

    mocker.patch("src.tasks.tokens.asyncio.sleep", new_callable=AsyncMock)

    from src.tasks.tokens import refresh_tokens

    await refresh_tokens()

    assert mock_token_service.refresh_token.await_count == 2
    assert mock_broker.publish.await_count == 2

    # проверяем routing_key и payload первого вызова
    first_call = mock_broker.publish.call_args_list[0]
    assert first_call.kwargs["routing_key"] == "auth.token.refreshed.twitch"
    assert first_call.kwargs["message"]["access_token"] == "at1"
    assert first_call.kwargs["message"]["refresh_token"] == "rt1"
    assert first_call.kwargs["message"]["user_id"] == "u1"
    assert first_call.kwargs["message"]["platform_user_id"] == "p1"
    assert first_call.kwargs["message"]["platform"] == "twitch"
    assert first_call.kwargs["message"]["expires_at"] == 1700000000
    assert first_call.kwargs["message"]["bot_settings"] == {"prefix": "!"}

    # проверяем второй вызов (bot_settings=None)
    second_call = mock_broker.publish.call_args_list[1]
    assert second_call.kwargs["routing_key"] == "auth.token.refreshed.da"
    assert second_call.kwargs["message"]["expires_at"] == 1700003600
    assert second_call.kwargs["message"]["bot_settings"] is None


@pytest.mark.asyncio
async def test_refresh_tokens_sleeps_between_iterations(mocker):
    """asyncio.sleep вызывается ровно столько раз, сколько токенов."""
    tokens = [_make_token(), _make_token()]

    mock_session = AsyncMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mocker.patch("src.tasks.tokens.async_session_maker", return_value=mock_cm)

    mock_token_service = mocker.patch("src.tasks.tokens.token_service")
    mock_token_service.fetch_tokens_to_refresh = AsyncMock(return_value=tokens)
    mock_token_service.refresh_token = AsyncMock(side_effect=[MagicMock(access_token="a", refresh_token="r")] * 2)

    mocker.patch("src.tasks.tokens.main_publisher").publish = AsyncMock()
    mock_sleep = mocker.patch("src.tasks.tokens.asyncio.sleep", new_callable=AsyncMock)

    from src.tasks.tokens import refresh_tokens

    await refresh_tokens()

    assert mock_sleep.await_count == 2
    # delay = random.random() + 0.5, то есть всегда >= 0.5
    for call in mock_sleep.call_args_list:
        assert call.args[0] >= 0.5
