from uuid import uuid4
from unittest.mock import AsyncMock, patch
import pytest

from src.services.manager import SignalRManager
from src.adapters._rabbit.dto import ConnectionData


@pytest.mark.asyncio
async def test_manager_instance_isolation():
    manager1 = SignalRManager()
    manager2 = SignalRManager()

    assert manager1.connections is not manager2.connections
    assert len(manager1.connections) == 0
    assert len(manager2.connections) == 0


@pytest.mark.asyncio
async def test_manager_add_and_stop_connection():
    manager = SignalRManager()
    user_id = uuid4()
    conn_data = ConnectionData(
        user_id=user_id,
        platform_user_id="user_123",
        access_token="access_1",
        refresh_token="refresh_1",
        expires_at=1000,
        bot_settings={"auto_read": True},
    )

    with patch("src.services.manager.SignalRListener") as mock_listener_cls:
        mock_instance = AsyncMock()
        mock_instance.platform_user_id = "user_123"
        mock_listener_cls.return_value = mock_instance

        await manager.add_connection(conn_data)

        assert len(manager.connections) == 1
        mock_instance.start.assert_awaited_once()

        # Stop connection
        await manager.stop_connection(mock_instance)
        assert len(manager.connections) == 0
        mock_instance.stop.assert_awaited_once()


@pytest.mark.asyncio
async def test_manager_replaces_duplicate_connection():
    manager = SignalRManager()
    user_id = uuid4()
    conn_data1 = ConnectionData(
        user_id=user_id,
        platform_user_id="user_dup",
        access_token="token_1",
        refresh_token="refresh_1",
        expires_at=1000,
    )
    conn_data2 = ConnectionData(
        user_id=user_id,
        platform_user_id="user_dup",
        access_token="token_2",
        refresh_token="refresh_2",
        expires_at=2000,
    )

    with patch("src.services.manager.SignalRListener") as mock_listener_cls:
        mock1 = AsyncMock()
        mock1.platform_user_id = "user_dup"
        mock2 = AsyncMock()
        mock2.platform_user_id = "user_dup"

        mock_listener_cls.side_effect = [mock1, mock2]

        await manager.add_connection(conn_data1)
        assert len(manager.connections) == 1
        assert manager.connections[0] is mock1

        # Adding same platform_user_id replaces previous connection
        await manager.add_connection(conn_data2)
        mock1.stop.assert_awaited_once()
        assert len(manager.connections) == 1
        assert manager.connections[0] is mock2


@pytest.mark.asyncio
async def test_manager_stop_all():
    manager = SignalRManager()
    mock1 = AsyncMock()
    mock2 = AsyncMock()

    manager.connections.append(mock1)
    manager.connections.append(mock2)

    await manager.stop()

    mock1.stop.assert_awaited_once()
    mock2.stop.assert_awaited_once()
    assert len(manager.connections) == 0
