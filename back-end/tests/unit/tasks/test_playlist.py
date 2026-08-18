"""Tests for src/tasks/playlist.py"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest


# ── простые sio-прокси ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_playnow_handler(mocker):
    event = MagicMock()
    mock_sio = mocker.patch("src.tasks.playlist.sio_playlist_service")
    mock_sio.set_playnow = AsyncMock()

    from src.tasks.playlist import playlist_track_playnow_handler

    await playlist_track_playnow_handler(event)

    mock_sio.set_playnow.assert_awaited_once_with(event)


@pytest.mark.asyncio
async def test_track_added_handler_returns_true(mocker):
    payload = MagicMock()
    playlist_id = uuid4()
    mock_sio = mocker.patch("src.tasks.playlist.sio_playlist_service")
    mock_sio.add_track = AsyncMock()

    from src.tasks.playlist import playlist_track_added_handler

    result = await playlist_track_added_handler(payload, playlist_id)

    mock_sio.add_track.assert_awaited_once_with(payload, playlist_id)
    assert result is True


@pytest.mark.asyncio
async def test_track_deleted_handler(mocker):
    payload = MagicMock()
    mock_sio = mocker.patch("src.tasks.playlist.sio_playlist_service")
    mock_sio.delete_track = AsyncMock()

    from src.tasks.playlist import playlist_track_deleted_handler

    await playlist_track_deleted_handler(payload)

    mock_sio.delete_track.assert_awaited_once_with(payload)


@pytest.mark.asyncio
async def test_track_move_handler(mocker):
    event = MagicMock()
    mock_sio = mocker.patch("src.tasks.playlist.sio_playlist_service")
    mock_sio.move_track = AsyncMock()

    from src.tasks.playlist import playlist_track_move_handler

    await playlist_track_move_handler(event)

    mock_sio.move_track.assert_awaited_once_with(event)


@pytest.mark.asyncio
async def test_privacy_private_handler(mocker):
    event = MagicMock()
    mock_sio = mocker.patch("src.tasks.playlist.sio_playlist_service")
    mock_sio.set_private = AsyncMock()

    from src.tasks.playlist import playlist_privacy_private_handler

    await playlist_privacy_private_handler(event)

    mock_sio.set_private.assert_awaited_once_with(event)


@pytest.mark.asyncio
async def test_settings_changed_handler(mocker):
    event = MagicMock()
    mock_sio = mocker.patch("src.tasks.playlist.sio_playlist_service")
    mock_sio.settings_changed = AsyncMock()

    from src.tasks.playlist import playlist_settings_changed_handler

    await playlist_settings_changed_handler(event)

    mock_sio.settings_changed.assert_awaited_once_with(event)

