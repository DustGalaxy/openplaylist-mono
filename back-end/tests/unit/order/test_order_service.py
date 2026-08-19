from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from src.exceptions import InvalidYouTubeUrl, NotEmbeddable
from src.services.order_service import OrderService
from src.services.youtube_service import VideoInfo, youtube_service


@pytest.fixture
def order_service():
    return OrderService()


@pytest.fixture
def mock_order():
    order = MagicMock()
    order.yt_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    order.owner_id = uuid4()
    order.request_id = uuid4()
    order.priority = "1"
    order.source = "web"
    order.owner_platform_id = "platform_user_777"
    order.requester_id = "req_1"
    order.requester_nickname = "Rick"
    return order


@pytest.mark.asyncio
async def test_init_order_invalid_url(order_service, mock_order):
    mock_order.yt_video_url = "invalid_url_string"
    with pytest.raises(InvalidYouTubeUrl):
        await order_service.init_order(mock_order, from_owner=True)


@pytest.mark.asyncio
async def test_init_order_success(order_service, mock_order, mocker):
    mock_info: VideoInfo = {
        "title": "Rick Astley - Never Gonna Give You Up",
        "author": "RickAstleyVEVO",
        "embeddable": True,
        "length": 212,
        "likes": 10000,
        "views": 1000000,
        "yt_video_id": "dQw4w9WgXcQ",
    }
    mocker.patch.object(youtube_service, "get_video_info", return_value=mock_info)

    mock_strategy = MagicMock()
    mock_strategy.model_validate.return_value = {}
    mocker.patch("src.services.order_service.STRATEGIES", {mock_order.source: mock_strategy})

    res = await order_service.init_order(mock_order, from_owner=True)

    assert res.title == "Rick Astley - Never Gonna Give You Up"
    assert res.author == "RickAstleyVEVO"
    assert res.duration == 212
    assert res.from_owner is True


@pytest.mark.asyncio
async def test_init_order_not_embeddable(order_service, mock_order, mocker):
    mock_info: VideoInfo = {
        "title": "Private Track",
        "author": "PrivateArtist",
        "embeddable": False,
        "length": 200,
        "likes": 0,
        "views": 0,
        "yt_video_id": "dQw4w9WgXcQ",
    }
    mocker.patch.object(youtube_service, "get_video_info", return_value=mock_info)

    with pytest.raises(NotEmbeddable):
        await order_service.init_order(mock_order, from_owner=True)
