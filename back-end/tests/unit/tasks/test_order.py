"""Tests for src/tasks/order.py"""

from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.fixture
def mock_order():
    return MagicMock()


@pytest.mark.asyncio
async def test_order_new_calls_init_order_and_kick(mock_order, mocker):
    """order_new инициализирует заказ и кикает order.created."""
    new_order = MagicMock()

    mock_order_service = mocker.patch("src.tasks.order.order_service")
    mock_order_service.init_order = AsyncMock(return_value=new_order)

    mock_kick = mocker.patch("src.tasks.order.kick", new_callable=AsyncMock)

    from src.tasks.order import order_new

    result = await order_new(mock_order, is_owner=False)

    mock_order_service.init_order.assert_awaited_once_with(mock_order, False)
    mock_kick.assert_awaited_once_with("order.created", mocker.ANY, new_order)
    assert result is new_order


@pytest.mark.asyncio
async def test_order_new_passes_from_owner_true(mock_order, mocker):
    """is_owner=True → from_owner=True передаётся в init_order."""
    new_order = MagicMock()

    mock_order_service = mocker.patch("src.tasks.order.order_service")
    mock_order_service.init_order = AsyncMock(return_value=new_order)
    mocker.patch("src.tasks.order.kick", new_callable=AsyncMock)

    from src.tasks.order import order_new

    await order_new(mock_order, is_owner=True)

    mock_order_service.init_order.assert_awaited_once_with(mock_order, True)


@pytest.mark.asyncio
async def test_order_new_passes_from_owner_false(mock_order, mocker):
    """is_owner=False → from_owner=False передаётся в init_order."""
    new_order = MagicMock()

    mock_order_service = mocker.patch("src.tasks.order.order_service")
    mock_order_service.init_order = AsyncMock(return_value=new_order)
    mocker.patch("src.tasks.order.kick", new_callable=AsyncMock)

    from src.tasks.order import order_new

    await order_new(mock_order, is_owner=False)

    mock_order_service.init_order.assert_awaited_once_with(mock_order, False)
