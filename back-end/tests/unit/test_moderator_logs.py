from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from src._types import PlaylistLogsEventTypes
from src.adapters._rabbit.worker.logs_handler import _, _get_operator_payload
from src.dto.internal.domain_events import EventOperator, InternalPlaylistEvent, InternalPlaylistEventType


def test_event_operator_creation():
    op = EventOperator(user_id=uuid4(), nickname="TestMod", access_level="moderator")
    assert op.nickname == "TestMod"
    assert op.access_level == "moderator"
    assert op.user_id is not None


def test_get_operator_payload_explicit():
    user_id = uuid4()
    op = EventOperator(user_id=user_id, nickname="Alice", access_level="owner")
    event = InternalPlaylistEvent(
        event_id=uuid4(),
        event_type=InternalPlaylistEventType.TRACK_ADDED,
        playlist_id=uuid4(),
        playlist_name="Test PL",
        playlist_is_public=True,
        user_id=user_id,
        user_name="Alice",
        operator=op,
    )
    payload = _get_operator_payload(event)
    assert payload["nickname"] == "Alice"
    assert payload["access_level"] == "owner"
    assert payload["user_id"] == str(user_id)


@pytest.mark.asyncio
async def test_logs_handler_moderator_claimed(mocker):
    db_mock = AsyncMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__.return_value = db_mock
    mock_cm.__aexit__.return_value = None
    mocker.patch("src.adapters._rabbit.worker.logs_handler.async_session_maker", return_value=mock_cm)

    mock_service = mocker.patch("src.adapters._rabbit.worker.logs_handler.playlist_log_service")
    mock_service.log_and_emit = AsyncMock()

    user_id = uuid4()
    pl_id = uuid4()
    op = EventOperator(user_id=user_id, nickname="ClaimedUser", access_level="moderator")

    event = InternalPlaylistEvent(
        event_id=uuid4(),
        event_type=InternalPlaylistEventType.MODERATOR_CLAIMED,
        playlist_id=pl_id,
        playlist_name="My Playlist",
        playlist_is_public=True,
        user_id=user_id,
        user_name="ClaimedUser",
        operator=op,
    )

    await _(event)

    mock_service.log_and_emit.assert_awaited_once()
    args = mock_service.log_and_emit.call_args[0]
    assert args[3] == PlaylistLogsEventTypes.CLAIM_LINK
    assert args[4]["operator"]["nickname"] == "ClaimedUser"
    assert args[4]["operator"]["access_level"] == "moderator"


@pytest.mark.asyncio
async def test_logs_handler_moderator_leave(mocker):
    db_mock = AsyncMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__.return_value = db_mock
    mock_cm.__aexit__.return_value = None
    mocker.patch("src.adapters._rabbit.worker.logs_handler.async_session_maker", return_value=mock_cm)

    mock_service = mocker.patch("src.adapters._rabbit.worker.logs_handler.playlist_log_service")
    mock_service.log_and_emit = AsyncMock()

    user_id = uuid4()
    pl_id = uuid4()
    op = EventOperator(user_id=user_id, nickname="LeavingMod", access_level="moderator")

    event = InternalPlaylistEvent(
        event_id=uuid4(),
        event_type=InternalPlaylistEventType.MODERATOR_LEFT,
        playlist_id=pl_id,
        playlist_name="My Playlist",
        playlist_is_public=True,
        user_id=user_id,
        user_name="LeavingMod",
        operator=op,
    )

    await _(event)

    mock_service.log_and_emit.assert_awaited_once()
    args = mock_service.log_and_emit.call_args[0]
    assert args[3] == PlaylistLogsEventTypes.MODERATOR_LEAVE
    assert args[4]["operator"]["access_level"] == "moderator"
