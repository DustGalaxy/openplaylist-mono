from uuid import uuid4
import pytest
from unittest.mock import MagicMock

from src.dto.order import WebNewOrder
from src._types import TrackSource
from src.exceptions import (
    DynamicMixNotSupported,
    PlaylistOrdersNotAllowedForViewers,
)
from src.services.order_service import order_service
from src.services.youtube_service import youtube_service, VideoInfo


@pytest.fixture
def sample_web_order():
    return WebNewOrder(
        request_id=uuid4(),
        owner_id=uuid4(),
        owner_platform_id="web",
        requester_id="user_1",
        requester_nickname="TestUser",
        playlist_id=str(uuid4()),
        yt_video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        priority="normal",
        source=TrackSource.WEB,
    )


@pytest.mark.asyncio
async def test_init_orders_single_video(sample_web_order, monkeypatch):
    mock_info: VideoInfo = {
        "title": "Rick Astley - Never Gonna Give You Up",
        "author": "RickAstleyVEVO",
        "embeddable": True,
        "length": 212,
        "likes": 10000,
        "views": 1000000,
        "yt_video_id": "dQw4w9WgXcQ",
    }
    monkeypatch.setattr(youtube_service, "get_video_info", lambda vid, url=None: mock_info)

    orders = await order_service.init_orders(sample_web_order, from_owner=False)
    assert len(orders) == 1
    assert orders[0].yt_video_id == "dQw4w9WgXcQ"
    assert orders[0].title == "Rick Astley - Never Gonna Give You Up"
    assert orders[0].author == "RickAstleyVEVO"


@pytest.mark.asyncio
async def test_init_orders_viewer_playlist_only_fails(sample_web_order):
    sample_web_order.yt_video_url = "https://www.youtube.com/playlist?list=PL1234567890"

    with pytest.raises(PlaylistOrdersNotAllowedForViewers):
        await order_service.init_orders(sample_web_order, from_owner=False)


@pytest.mark.asyncio
async def test_init_orders_viewer_video_in_playlist_fallback(sample_web_order, monkeypatch):
    sample_web_order.yt_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890"

    mock_info: VideoInfo = {
        "title": "Rick Astley - Never Gonna Give You Up",
        "author": "RickAstleyVEVO",
        "embeddable": True,
        "length": 212,
        "likes": 10000,
        "views": 1000000,
        "yt_video_id": "dQw4w9WgXcQ",
    }
    monkeypatch.setattr(youtube_service, "get_video_info", lambda vid, url=None: mock_info)

    orders = await order_service.init_orders(sample_web_order, from_owner=False)
    assert len(orders) == 1
    assert orders[0].yt_video_id == "dQw4w9WgXcQ"


@pytest.mark.asyncio
async def test_init_orders_dynamic_mix_fails_for_owner(sample_web_order):
    sample_web_order.yt_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RD1234567890"

    with pytest.raises(DynamicMixNotSupported):
        await order_service.init_orders(sample_web_order, from_owner=True)


@pytest.mark.asyncio
async def test_init_orders_owner_playlist_batch(sample_web_order, monkeypatch):
    sample_web_order.yt_video_url = "https://www.youtube.com/playlist?list=PL1234567890"

    tracks_mock: list[VideoInfo] = [
        {
            "title": f"Track {i}",
            "author": "Artist",
            "embeddable": True,
            "length": 180,
            "likes": 100,
            "views": 1000,
            "yt_video_id": f"video_id_{i}",
        }
        for i in range(5)
    ]
    monkeypatch.setattr(
        youtube_service,
        "get_playlist_tracks",
        lambda playlist_id, start_video_id=None, limit=50: tracks_mock,
    )

    orders = await order_service.init_orders(sample_web_order, from_owner=True)
    assert len(orders) == 5
    assert orders[0].yt_video_id == "video_id_0"
    assert orders[4].yt_video_id == "video_id_4"


@pytest.mark.asyncio
async def test_init_orders_owner_start_from_target(sample_web_order, monkeypatch):
    sample_web_order.yt_video_url = "https://www.youtube.com/watch?v=target_vid&list=PL1234567890"

    captured_start_id = None

    def mock_get_playlist_tracks(playlist_id, start_video_id=None, limit=50):
        nonlocal captured_start_id
        captured_start_id = start_video_id
        return [
            {
                "title": "Target Track",
                "author": "Artist",
                "embeddable": True,
                "length": 180,
                "likes": 100,
                "views": 1000,
                "yt_video_id": "target_vid",
            }
        ]

    monkeypatch.setattr(youtube_service, "get_playlist_tracks", mock_get_playlist_tracks)

    orders = await order_service.init_orders(sample_web_order, from_owner=True, start_from_target=True)
    assert len(orders) == 1
    assert captured_start_id == "target_vid"

