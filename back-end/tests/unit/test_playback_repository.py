import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4

from src.dal._redis.playback_repository import PlaybackRepository, parse_state


def test_parse_state_empty():
    parsed = parse_state({})
    assert parsed["is_paused"] == "True"
    assert parsed["position"] == "0.0"
    assert parsed["track_id"] is None


def test_parse_state_valid():
    raw = {"is_paused": "0", "position": "42.5", "track_id": "12345678-1234-5678-1234-567812345678"}
    parsed = parse_state(raw)
    assert parsed["is_paused"] == "False"
    assert parsed["position"] == "42.5"
    assert parsed["track_id"] == "12345678-1234-5678-1234-567812345678"


@pytest.mark.asyncio
async def test_playback_repository_get_all():
    repo = PlaybackRepository()
    playlist_id = uuid4()
    mock_data = {"is_paused": "1", "position": "10.0", "track_id": "None"}

    with patch("src.dal._redis.playback_repository.get_broker") as mock_get_broker:
        mock_broker_instance = MagicMock()
        mock_broker_instance.hgetall.return_value = mock_data
        mock_get_broker.return_value = mock_broker_instance

        res = await repo.get_all(playlist_id)
        assert res == mock_data
        mock_broker_instance.hgetall.assert_called_once_with(f"playback:{playlist_id}")


@pytest.mark.asyncio
async def test_playback_repository_save_and_get_state():
    repo = PlaybackRepository()
    playlist_id = uuid4()
    mock_data = {"is_paused": "0", "position": "15.0", "track_id": "track-123"}

    with patch("src.dal._redis.playback_repository.get_broker") as mock_get_broker:
        mock_broker_instance = MagicMock()
        mock_broker_instance.hgetall.return_value = mock_data
        mock_get_broker.return_value = mock_broker_instance

        repo.save_state(playlist_id, mock_data)
        mock_broker_instance.hset.assert_called_once_with(f"playback:{playlist_id}", mapping=mock_data)
        mock_broker_instance.expire.assert_called_once_with(f"playback:{playlist_id}", 259200)

        state = await repo.get_state(playlist_id)
        assert state["is_paused"] == "False"
        assert state["position"] == "15.0"
        assert state["track_id"] == "track-123"


def test_playback_dto_client_id():
    from src.dto.playback import Pause, Seek, PlaybackPauseEvent, PlaybackSeekEvent

    pause_dto = Pause(is_paused=True, position=12.5, track_id=uuid4(), client_id="test-client-123")
    assert pause_dto.client_id == "test-client-123"
    assert pause_dto.model_dump()["client_id"] == "test-client-123"

    seek_dto = Seek(position=45.0, track_id=uuid4(), client_id="test-client-456")
    assert seek_dto.client_id == "test-client-456"
    assert seek_dto.model_dump()["client_id"] == "test-client-456"

    pause_event = PlaybackPauseEvent(playlist_id=uuid4(), user_id=uuid4(), state=pause_dto)
    assert pause_event.state.client_id == "test-client-123"

    seek_event = PlaybackSeekEvent(playlist_id=uuid4(), user_id=uuid4(), state=seek_dto)
    assert seek_event.state.client_id == "test-client-456"


@pytest.mark.asyncio
async def test_playback_handler_client_id_propagation():
    from src.dto.playback import Pause, Seek, PlaybackPauseEvent, PlaybackSeekEvent
    from src.adapters._rabbit.worker.playback_handler import (
        playback_pause_subscriber,
        playback_seek_subscriber,
    )

    playlist_id = uuid4()
    user_id = uuid4()
    pause_dto = Pause(is_paused=True, position=10.0, track_id=uuid4(), client_id="client-abc")
    pause_event = PlaybackPauseEvent(playlist_id=playlist_id, user_id=user_id, state=pause_dto)

    with patch("src.adapters._rabbit.worker.playback_handler.sio_playlist_service.pause", new_callable=AsyncMock) as mock_sio_pause, \
         patch("src.adapters._rabbit.worker.playback_handler.sio_widget_service.pause", new_callable=AsyncMock) as mock_widget_pause:
        await playback_pause_subscriber(pause_event)
        mock_sio_pause.assert_called_once_with(playlist_id, pause_dto)
        assert mock_sio_pause.call_args[0][1].client_id == "client-abc"
        mock_widget_pause.assert_called_once_with(user_id, pause_dto)

    seek_dto = Seek(position=20.0, track_id=uuid4(), client_id="client-xyz")
@pytest.mark.asyncio
async def test_playback_routes_position_no_publish_and_seek_publishes():
    from src.adapters._fastapi.playback_routes import post_position_state, post_seek_state
    from src.dto.moderator import ModeratorPlaylistAccessInfo
    from src.dto.playback import Seek

    playlist_id = uuid4()
    user_id = uuid4()
    access = ModeratorPlaylistAccessInfo(
        playlist_id=playlist_id,
        user_id=user_id,
        name="test_mod",
        access_level="moderator",
        can_manage_tracks=True,
        can_manage_settings=False,
    )


    # 1. Test post_position_state: updates position state but does NOT publish to rabbit
    with patch("src.adapters._fastapi.playback_routes.set_position_state", new_callable=AsyncMock) as mock_set_pos, \
         patch("src.adapters._fastapi.playback_routes.main_publisher.publish", new_callable=AsyncMock) as mock_publish:
        mock_db = AsyncMock()
        await post_position_state(
            db_session=mock_db,
            access=access,
            playlist_id=playlist_id,
            position=33.5,
            client_id="client_pos_1",
        )
        mock_set_pos.assert_called_once_with(mock_db, playlist_id, 33.5, skip_owner_check=True)
        mock_publish.assert_not_called()

    # 2. Test post_seek_state: updates seek state AND publishes PlaybackSeekEvent
    seek_data = Seek(position=45.0, track_id=uuid4(), client_id="client_seek_1")
    with patch("src.adapters._fastapi.playback_routes.seek", new_callable=AsyncMock) as mock_seek, \
         patch("src.adapters._fastapi.playback_routes.main_publisher.publish", new_callable=AsyncMock) as mock_publish:
        mock_db = AsyncMock()
        await post_seek_state(
            db_session=mock_db,
            access=access,
            playlist_id=playlist_id,
            data=seek_data,
        )
        mock_seek.assert_called_once_with(mock_db, playlist_id, seek_data, skip_owner_check=True)
        mock_publish.assert_called_once()
        published_event = mock_publish.call_args[0][0]
        assert published_event.playlist_id == playlist_id
        assert published_event.state.position == 45.0
        assert published_event.state.client_id == "client_seek_1"


