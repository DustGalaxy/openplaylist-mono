from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from src.dal._redis.player_repository import PlayerRepository, parse_player_state
from src.dto.player import (
    PlayerBroadcastRequest,
    PlayerPauseRequest,
    PlayerPlayRequest,
    PlayerSeekRequest,
    PlayerVolumeRequest,
)


def test_parse_player_state_empty():
    owner_id = uuid4()
    parsed = parse_player_state(owner_id, {})
    assert parsed is None


def test_parse_player_state_valid():
    owner_id = uuid4()
    playlist_id = uuid4()
    raw = {
        "owner_id": str(owner_id),
        "active_playlist_id": str(playlist_id),
        "current_track_id": "track-xyz",
        "current_track_data": '{"title": "Song Title", "duration": 180}',
        "position": "45.5",
        "is_paused": "0",
        "volume": "75",
        "broadcast_to_widget": "1",
        "last_client_id": "client-abc",
    }
    parsed = parse_player_state(owner_id, raw)
    assert parsed is not None
    assert parsed.owner_id == owner_id
    assert parsed.active_playlist_id == playlist_id
    assert parsed.current_track_id == "track-xyz"
    assert parsed.current_track_data == {"title": "Song Title", "duration": 180}
    assert parsed.position == 45.5
    assert parsed.is_paused is False
    assert parsed.volume == 75
    assert parsed.broadcast_to_widget is True
    assert parsed.last_client_id == "client-abc"


@pytest.mark.asyncio
async def test_player_repository_save_and_get():
    repo = PlayerRepository()
    owner_id = uuid4()
    playlist_id = uuid4()
    mock_data = {
        "owner_id": str(owner_id),
        "active_playlist_id": str(playlist_id),
        "current_track_id": "track-123",
        "position": "10.0",
        "is_paused": "1",
        "volume": "90",
        "broadcast_to_widget": "1",
        "last_client_id": "client-1",
    }

    with patch("src.dal._redis.player_repository.get_broker") as mock_get_broker:
        mock_broker_instance = MagicMock()
        mock_broker_instance.hgetall.return_value = mock_data
        mock_get_broker.return_value = mock_broker_instance

        repo.save_state(owner_id, {"position": 10.0, "is_paused": True})
        mock_broker_instance.hset.assert_called_once()
        mock_broker_instance.expire.assert_called_once()

        state = await repo.get_player_state(owner_id)
        assert state is not None
        assert state.position == 10.0
        assert state.is_paused is True
        assert state.volume == 90


def test_player_dtos():
    play_req = PlayerPlayRequest(track_id="tr-1", playlist_id=uuid4(), client_id="cid-1", position=5.0)
    assert play_req.track_id == "tr-1"
    assert play_req.client_id == "cid-1"

    pause_req = PlayerPauseRequest(is_paused=True, position=12.0, client_id="cid-2")
    assert pause_req.is_paused is True

    seek_req = PlayerSeekRequest(position=42.0, client_id="cid-3")
    assert seek_req.position == 42.0

    vol_req = PlayerVolumeRequest(volume=50, client_id="cid-4")
    assert vol_req.volume == 50

    bcast_req = PlayerBroadcastRequest(enabled=False, client_id="cid-5")
    assert bcast_req.enabled is False
