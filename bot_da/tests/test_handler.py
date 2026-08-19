import json
from unittest.mock import AsyncMock, patch
from uuid import uuid4
import pytest

from services.handler import handler


@pytest.mark.asyncio
async def test_handler_processes_valid_donation_with_youtube():
    owner_id = uuid4()
    channel_name = "$alerts:donation_123456"

    message_payload = {
        "result": {
            "channel": channel_name,
            "data": {
                "data": {
                    "id": 171664512,
                    "name": "Donations",
                    "username": "SuperFan",
                    "message": "Вруби вот это https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    "message_type": "text",
                    "payin_system": None,
                    "amount": 300.0,
                    "currency": "RUB",
                    "is_shown": 0,
                    "amount_in_user_currency": 300.0,
                    "recipient_name": "streamer",
                    "recipient": {
                        "user_id": 1772371,
                        "code": "streamer",
                        "name": "streamer",
                        "avatar": "https://example.com/avatar.png",
                    },
                    "created_at": "2026-08-19 12:00:00",
                    "shown_at": None,
                    "reason": "default",
                }
            },
        }
    }

    message_str = json.dumps(message_payload)

    with patch("services.handler.rabbit_broker.publish", new_callable=AsyncMock) as mock_publish:
        await handler(message_str, owner_id, channel_name)

        assert mock_publish.await_count == 1
        published_order, queue, exchange = mock_publish.await_args[0]

        assert published_order.owner_id == owner_id
        assert published_order.owner_platform_id == "1772371"
        assert published_order.requester_nickname == "SuperFan"
        assert published_order.donation_amount == 300.0
        assert published_order.donation_currency == "RUB"
        assert published_order.yt_video_url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert published_order.priority == "donation"


@pytest.mark.asyncio
async def test_handler_ignores_donation_without_youtube():
    owner_id = uuid4()
    channel_name = "$alerts:donation_123456"

    message_payload = {
        "result": {
            "channel": channel_name,
            "data": {
                "data": {
                    "id": 171664513,
                    "name": "Donations",
                    "username": "JustFan",
                    "message": "Привет стримеру без ссылок!",
                    "amount": 100.0,
                    "currency": "RUB",
                    "amount_in_user_currency": 100.0,
                    "recipient": {
                        "user_id": 1772371,
                    },
                }
            },
        }
    }

    message_str = json.dumps(message_payload)

    with patch("services.handler.rabbit_broker.publish", new_callable=AsyncMock) as mock_publish:
        await handler(message_str, owner_id, channel_name)
        mock_publish.assert_not_called()
