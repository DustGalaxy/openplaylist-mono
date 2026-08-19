from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock
import pytest

from src.adapters._rabbit.handlers import add_connection, disconnect_from_donatex
from src.adapters._rabbit.dto import ConnectionData
from src.app_context import context


@pytest.mark.asyncio
async def test_add_connection_handler_success():
    mock_manager = MagicMock()
    mock_manager.add_connection = AsyncMock()
    context.manager = mock_manager

    conn_data = ConnectionData(
        user_id=uuid4(),
        platform_user_id="user_test_1",
        access_token="token_1",
        refresh_token="ref_1",
        expires_at=1000,
    )

    result = await add_connection(conn_data)
    assert result is True
    mock_manager.add_connection.assert_awaited_once_with(conn_data)


@pytest.mark.asyncio
async def test_add_connection_handler_without_manager():
    context.manager = None

    conn_data = ConnectionData(
        user_id=uuid4(),
        platform_user_id="user_test_2",
        access_token="token_2",
        refresh_token="ref_2",
        expires_at=1000,
    )

    result = await add_connection(conn_data)
    assert result is False


@pytest.mark.asyncio
async def test_disconnect_handler_success():
    mock_listener = MagicMock()
    mock_listener.platform_user_id = "user_disc_1"

    mock_manager = MagicMock()
    mock_manager.connections = [mock_listener]
    mock_manager.stop_connection = AsyncMock()
    context.manager = mock_manager

    result = await disconnect_from_donatex("user_disc_1")
    assert result is True
    mock_manager.stop_connection.assert_awaited_once_with(mock_listener)


@pytest.mark.asyncio
async def test_disconnect_handler_not_found_returns_true():
    mock_manager = MagicMock()
    mock_manager.connections = []
    context.manager = mock_manager

    result = await disconnect_from_donatex("user_non_existent")
    assert result is True
