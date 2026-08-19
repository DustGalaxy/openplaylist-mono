from uuid import uuid4
from unittest.mock import AsyncMock, patch
import pytest

from src.services.handler import handler


@pytest.mark.asyncio
async def test_handler_processes_valid_youtube_donation():
    owner_id = uuid4()
    owner_platform_id = "dx_platform_123"

    donation_payload = {
        "id": str(uuid4()),
        "username": "SuperFan",
        "message": "Врубай этот бэнгер https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "amount": 250.0,
        "currency": "RUB",
    }

    with patch("src.services.handler.rabbit_broker.publish", new_callable=AsyncMock) as mock_publish:
        await handler(donation_payload, owner_id, owner_platform_id)

        assert mock_publish.await_count == 1
        published_order, queue, exchange = mock_publish.await_args[0]

        assert published_order.owner_id == owner_id
        assert published_order.owner_platform_id == owner_platform_id
        assert published_order.requester_nickname == "SuperFan"
        assert published_order.donation_amount == 250.0
        assert published_order.donation_currency == "RUB"
        assert published_order.yt_video_url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert published_order.priority == "donation"


@pytest.mark.asyncio
async def test_handler_ignores_donation_without_youtube_url():
    owner_id = uuid4()
    owner_platform_id = "dx_platform_123"

    donation_payload = {
        "id": str(uuid4()),
        "username": "JustChatter",
        "message": "Просто привет стримеру без ссылок",
        "amount": 100.0,
        "currency": "RUB",
    }

    with patch("src.services.handler.rabbit_broker.publish", new_callable=AsyncMock) as mock_publish:
        await handler(donation_payload, owner_id, owner_platform_id)
        mock_publish.assert_not_called()
