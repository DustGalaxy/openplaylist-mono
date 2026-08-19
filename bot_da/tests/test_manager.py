from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
import pytest

from adapters._rabbit.dto import ConnectionData
from services.manager import Manager
from services.da_client import DonationAlertsListener


@pytest.mark.asyncio
async def test_manager_instance_isolation():
    m1 = Manager()
    m2 = Manager()
    assert m1.connections is not m2.connections
    assert len(m1.connections) == 0


@pytest.mark.asyncio
async def test_manager_add_and_stop_connection():
    manager = Manager()
    user_id = uuid4()
    platform_user_id = "da_user_999"

    conn_data = ConnectionData(
        user_id=user_id,
        platform_user_id=platform_user_id,
        access_token="tok_1",
        refresh_token="ref_1",
        expires_at=1000,
    )

    mock_listener = MagicMock(spec=DonationAlertsListener)
    mock_listener.platform_user_id = platform_user_id
    mock_listener.start = AsyncMock()
    mock_listener.stop = AsyncMock()

    await manager.run_connection(mock_listener)
    assert len(manager.connections) == 1
    mock_listener.start.assert_awaited_once()

    await manager.stop_connection(mock_listener)
    assert len(manager.connections) == 0
    mock_listener.stop.assert_awaited_once()


@pytest.mark.asyncio
async def test_manager_replaces_duplicate_connection():
    manager = Manager()
    user_id = uuid4()
    platform_user_id = "da_user_dup"

    conn_data1 = ConnectionData(
        user_id=user_id,
        platform_user_id=platform_user_id,
        access_token="tok_1",
        refresh_token="ref_1",
        expires_at=1000,
    )

    mock_listener1 = MagicMock(spec=DonationAlertsListener)
    mock_listener1.platform_user_id = platform_user_id
    mock_listener1.start = AsyncMock()
    mock_listener1.stop = AsyncMock()

    manager.connections.append(mock_listener1)

    mock_new_listener = MagicMock(spec=DonationAlertsListener)
    mock_new_listener.platform_user_id = platform_user_id
    mock_new_listener.start = AsyncMock()
    mock_new_listener.stop = AsyncMock()

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr("services.manager.DonationAlertsListener", lambda *args, **kwargs: mock_new_listener)
        await manager.add_connection(conn_data1)

    mock_listener1.stop.assert_awaited_once()
    assert len(manager.connections) == 1
    assert manager.connections[0] is mock_new_listener
