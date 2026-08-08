"""Tests for src/tasks/playlist.py"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest


# ── простые sio-прокси ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_playnow_handler(mocker):
    event = MagicMock()
    mock_sio = mocker.patch("src.tasks.playlist.sio_service")
    mock_sio.set_playnow = AsyncMock()

    from src.tasks.playlist import playlist_track_playnow_handler

    await playlist_track_playnow_handler(event)

    mock_sio.set_playnow.assert_awaited_once_with(event)


@pytest.mark.asyncio
async def test_track_added_handler_returns_true(mocker):
    payload = MagicMock()
    playlist_id = uuid4()
    mock_sio = mocker.patch("src.tasks.playlist.sio_service")
    mock_sio.add_track = AsyncMock()

    from src.tasks.playlist import playlist_track_added_handler

    result = await playlist_track_added_handler(payload, playlist_id)

    mock_sio.add_track.assert_awaited_once_with(payload, playlist_id)
    assert result is True


@pytest.mark.asyncio
async def test_track_deleted_handler(mocker):
    payload = MagicMock()
    mock_sio = mocker.patch("src.tasks.playlist.sio_service")
    mock_sio.delete_track = AsyncMock()

    from src.tasks.playlist import playlist_track_deleted_handler

    await playlist_track_deleted_handler(payload)

    mock_sio.delete_track.assert_awaited_once_with(payload)


@pytest.mark.asyncio
async def test_track_move_handler(mocker):
    event = MagicMock()
    mock_sio = mocker.patch("src.tasks.playlist.sio_service")
    mock_sio.move_track = AsyncMock()

    from src.tasks.playlist import playlist_track_move_handler

    await playlist_track_move_handler(event)

    mock_sio.move_track.assert_awaited_once_with(event)


@pytest.mark.asyncio
async def test_privacy_private_handler(mocker):
    event = MagicMock()
    mock_sio = mocker.patch("src.tasks.playlist.sio_service")
    mock_sio.set_private = AsyncMock()

    from src.tasks.playlist import playlist_privacy_private_handler

    await playlist_privacy_private_handler(event)

    mock_sio.set_private.assert_awaited_once_with(event)


@pytest.mark.asyncio
async def test_settings_changed_handler(mocker):
    event = MagicMock()
    mock_sio = mocker.patch("src.tasks.playlist.sio_service")
    mock_sio.settings_changed = AsyncMock()

    from src.tasks.playlist import playlist_settings_changed_handler

    await playlist_settings_changed_handler(event)

    mock_sio.settings_changed.assert_awaited_once_with(event)


# ── handle_order_created ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_handle_order_created_kicks_for_each_track(mocker):
    """Для каждого трека → kick + log ADD_TRACK."""
    owner = MagicMock()
    track1, track2 = MagicMock(), MagicMock()
    pid1, pid2 = uuid4(), uuid4()

    payload = MagicMock()
    payload.owner_id = uuid4()
    payload.from_owner = False
    payload.title = "Song"
    payload.yt_video_id = "abc"
    payload.source = "twitch"

    mock_session = AsyncMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mocker.patch("src.tasks.playlist.async_session_maker", return_value=mock_cm)

    mock_user_repo = mocker.patch("src.tasks.playlist.user_repository")
    mock_user_repo.get_one = AsyncMock(return_value=owner)

    mocker.patch(
        "src.tasks.playlist.add_to_playlist",
        new=AsyncMock(return_value=([(track1, pid1), (track2, pid2)], [])),
    )

    mock_kick = mocker.patch("src.tasks.playlist.kick", new_callable=AsyncMock)
    mock_log_svc = mocker.patch("src.tasks.playlist.playlist_log_service")
    mock_log_svc.log_and_emit = AsyncMock()

    from src.tasks.playlist import handle_order_created

    tracks, errors = await handle_order_created(payload)

    assert mock_kick.await_count == 2
    assert mock_log_svc.log_and_emit.await_count == 2
    assert errors == []


@pytest.mark.asyncio
async def test_handle_order_created_logs_errors(mocker):
    """Для каждой ошибки → log ADD_TRACK_ERROR, kick не вызывается."""
    owner = MagicMock()
    pid = uuid4()

    payload = MagicMock()
    payload.owner_id = uuid4()
    payload.from_owner = False
    payload.title = "Song"
    payload.yt_video_id = "abc"
    payload.source = "twitch"

    mock_session = AsyncMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mocker.patch("src.tasks.playlist.async_session_maker", return_value=mock_cm)

    mock_user_repo = mocker.patch("src.tasks.playlist.user_repository")
    mock_user_repo.get_one = AsyncMock(return_value=owner)

    mocker.patch(
        "src.tasks.playlist.add_to_playlist",
        new=AsyncMock(return_value=([], [(["Too long"], "Playlist A", pid)])),
    )

    mock_kick = mocker.patch("src.tasks.playlist.kick", new_callable=AsyncMock)
    mock_log_svc = mocker.patch("src.tasks.playlist.playlist_log_service")
    mock_log_svc.log_and_emit = AsyncMock()

    from src.tasks.playlist import handle_order_created

    tracks, errors = await handle_order_created(payload)

    mock_kick.assert_not_called()
    mock_log_svc.log_and_emit.assert_awaited_once()
    # проверяем что передан правильный тип события
    call_args = mock_log_svc.log_and_emit.call_args
    from src._types import PlaylistLogsEventTypes

    assert call_args.args[3] == PlaylistLogsEventTypes.ADD_TRACK_ERROR


@pytest.mark.asyncio
async def test_handle_order_created_mixed(mocker):
    """Один трек добавлен + одна ошибка → kick раз, log_and_emit дважды."""
    owner = MagicMock()
    track = MagicMock()
    pid_ok, pid_err = uuid4(), uuid4()

    payload = MagicMock()
    payload.owner_id = uuid4()
    payload.from_owner = False
    payload.title = "Song"
    payload.yt_video_id = "abc"
    payload.source = "twitch"

    mock_session = AsyncMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mocker.patch("src.tasks.playlist.async_session_maker", return_value=mock_cm)

    mocker.patch("src.tasks.playlist.user_repository").get_one = AsyncMock(return_value=owner)
    mocker.patch(
        "src.tasks.playlist.add_to_playlist",
        new=AsyncMock(
            return_value=(
                [(track, pid_ok)],
                [(["Not enough views"], "Strict", pid_err)],
            )
        ),
    )

    mock_kick = mocker.patch("src.tasks.playlist.kick", new_callable=AsyncMock)
    mock_log_svc = mocker.patch("src.tasks.playlist.playlist_log_service")
    mock_log_svc.log_and_emit = AsyncMock()

    from src.tasks.playlist import handle_order_created

    await handle_order_created(payload)

    mock_kick.assert_awaited_once()
    assert mock_log_svc.log_and_emit.await_count == 2
