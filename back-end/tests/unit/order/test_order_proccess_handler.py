import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from src.adapters._rabbit.queues import bot_order_cancelled, bot_order_completed, main_exchange, playlist_fanout_exchange
from src.adapters._rabbit.worker.order_proccess_handler import _ as handle_order_proccess
from src.dto.order import NewOrderPayload, OrderUpdate, TTVNewOrder
from src.exceptions import InvalidYouTubeUrl
from src.models.order import OrderCreate, OrderDomain, TTVExtraData


@pytest.fixture
def mock_ttv_order():
    return TTVNewOrder(
        request_id=uuid4(),
        owner_platform_id="161514804",
        owner_id=uuid4(),
        requester_id="99999",
        requester_nickname="Viewer123",
        yt_video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        priority="points",
        reward_id="reward-uuid-1",
        redemption_id="redemption-uuid-2",
    )


@pytest.mark.asyncio
async def test_order_proccess_handler_success(mock_ttv_order, mocker):
    mock_publisher = mocker.patch("src.adapters._rabbit.worker.order_proccess_handler.main_publisher")
    mock_publisher.publish = AsyncMock()

    mock_extra = TTVExtraData(
        requester_id="99999",
        reward_id="reward-uuid-1",
        redemption_id="redemption-uuid-2",
    )
    mock_order_create = OrderCreate(
        request_id=mock_ttv_order.request_id,
        owner_id=mock_ttv_order.owner_id,
        owner_platform_id="161514804",
        from_owner=False,
        requester_id="99999",
        requester_nickname="Viewer123",
        priority="points",
        yt_video_id="dQw4w9WgXcQ",
        title="Rick Astley - Never Gonna Give You Up",
        duration=212,
        views=1000000,
        likes=50000,
        extra_data=mock_extra,
        source="twitch",
    )

    mocker.patch(
        "src.adapters._rabbit.worker.order_proccess_handler.order_service.init_orders",
        new_callable=AsyncMock,
        return_value=[mock_order_create],
    )

    mock_owner = MagicMock()
    mock_owner.id = mock_ttv_order.owner_id
    mock_owner.username = "dustgalaxy"
    mocker.patch(
        "src.adapters._rabbit.worker.order_proccess_handler.user_repository.get_one",
        new_callable=AsyncMock,
        return_value=mock_owner,
    )

    mock_track = MagicMock(spec=OrderDomain)
    mock_track.id = uuid4()
    mock_track.title = "Rick Astley - Never Gonna Give You Up"
    mock_track.requester_nickname = "Viewer123"
    mock_track.priority = "points"
    mock_track.from_owner = False
    mock_track.extra_data = mock_extra

    mock_playlist = MagicMock()
    mock_playlist.id = uuid4()
    mock_playlist.name = "Main Playlist"
    mock_playlist.is_public = True

    mocker.patch(
        "src.adapters._rabbit.worker.order_proccess_handler.add_to_playlist_batch",
        new_callable=AsyncMock,
        return_value=([(mock_track, mock_playlist)], []),
    )

    payload = NewOrderPayload(order=mock_ttv_order, from_owner=False)
    await handle_order_proccess(payload)

    assert mock_publisher.publish.call_count == 2

    # Check 1: Fanout event for widget
    first_call_args, first_call_kwargs = mock_publisher.publish.call_args_list[0]
    assert first_call_kwargs["exchange"] == playlist_fanout_exchange

    # Check 2: Direct OrderUpdate for bot feedback
    second_call_args, second_call_kwargs = mock_publisher.publish.call_args_list[1]
    order_update: OrderUpdate = second_call_args[0]
    assert order_update.status == "completed"
    assert order_update.owner_platform_id == "161514804"
    assert order_update.reward_id == "reward-uuid-1"
    assert order_update.redemption_id == "redemption-uuid-2"
    assert "Rick Astley" in order_update.details
    assert second_call_args[1] == bot_order_completed
    assert second_call_args[2] == main_exchange


@pytest.mark.asyncio
async def test_order_proccess_handler_rejected(mock_ttv_order, mocker):
    mock_publisher = mocker.patch("src.adapters._rabbit.worker.order_proccess_handler.main_publisher")
    mock_publisher.publish = AsyncMock()

    mock_extra = TTVExtraData(
        requester_id="99999",
        reward_id="reward-uuid-1",
        redemption_id="redemption-uuid-2",
    )
    mock_order_create = OrderCreate(
        request_id=mock_ttv_order.request_id,
        owner_id=mock_ttv_order.owner_id,
        owner_platform_id="161514804",
        from_owner=False,
        requester_id="99999",
        requester_nickname="Viewer123",
        priority="points",
        yt_video_id="dQw4w9WgXcQ",
        title="Disallowed Video",
        duration=5000,
        views=10,
        likes=1,
        extra_data=mock_extra,
        source="twitch",
    )

    mocker.patch(
        "src.adapters._rabbit.worker.order_proccess_handler.order_service.init_orders",
        new_callable=AsyncMock,
        return_value=[mock_order_create],
    )

    mock_owner = MagicMock()
    mock_owner.id = mock_ttv_order.owner_id
    mock_owner.username = "dustgalaxy"
    mocker.patch(
        "src.adapters._rabbit.worker.order_proccess_handler.user_repository.get_one",
        new_callable=AsyncMock,
        return_value=mock_owner,
    )

    mock_playlist = MagicMock()
    mock_playlist.id = uuid4()
    mock_playlist.name = "Main Playlist"
    mock_playlist.is_public = True

    mocker.patch(
        "src.adapters._rabbit.worker.order_proccess_handler.add_to_playlist_batch",
        new_callable=AsyncMock,
        return_value=([], [(["Duration exceeds limit"], mock_playlist)]),
    )

    payload = NewOrderPayload(order=mock_ttv_order, from_owner=False)
    await handle_order_proccess(payload)

    assert mock_publisher.publish.call_count == 2

    second_call_args, _ = mock_publisher.publish.call_args_list[1]
    order_update: OrderUpdate = second_call_args[0]
    assert order_update.status == "cancelled"
    assert order_update.owner_platform_id == "161514804"
    assert order_update.reward_id == "reward-uuid-1"
    assert order_update.redemption_id == "redemption-uuid-2"
    assert "Duration exceeds limit" in order_update.details
    assert second_call_args[1] == bot_order_cancelled
    assert second_call_args[2] == main_exchange


@pytest.mark.asyncio
async def test_order_proccess_handler_init_orders_exception(mock_ttv_order, mocker):
    mock_publisher = mocker.patch("src.adapters._rabbit.worker.order_proccess_handler.main_publisher")
    mock_publisher.publish = AsyncMock()

    mocker.patch(
        "src.adapters._rabbit.worker.order_proccess_handler.order_service.init_orders",
        new_callable=AsyncMock,
        side_effect=InvalidYouTubeUrl("Video is unavailable or private"),
    )

    payload = NewOrderPayload(order=mock_ttv_order, from_owner=False)
    await handle_order_proccess(payload)

    assert mock_publisher.publish.call_count == 1

    call_args, _ = mock_publisher.publish.call_args_list[0]
    order_update: OrderUpdate = call_args[0]
    assert order_update.status == "cancelled"
    assert order_update.owner_platform_id == "161514804"
    assert order_update.reward_id == "reward-uuid-1"
    assert order_update.redemption_id == "redemption-uuid-2"
    assert "Video is unavailable or private" in order_update.details
    assert call_args[1] == bot_order_cancelled
    assert call_args[2] == main_exchange
