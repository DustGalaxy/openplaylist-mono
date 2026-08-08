from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from src.models.auth_user import AuthUserSchema as User
from src.models.playlist import PlaylistSchema
from src.services.playlists.favorite_service import FavoritePlaylistService


@pytest.fixture
def mock_user():
    return User(
        id=uuid4(),
        username="test_user",
        bio="",
        email="test@example.com",
        email_confirmed=True,
        is_public=True,
        is_active=True,
        last_login=MagicMock(),
        created_at=MagicMock(),
        updated_at=MagicMock(),
    )


@pytest.fixture
def mock_playlist(mock_user):
    return PlaylistSchema(
        id=uuid4(),
        owner_id=mock_user.id,
        owner_nickname=mock_user.username,
        name="Test Playlist",
        description="Description",
        tags=[],
        is_public=True,
        favorites_count=0,
        show_in_widget=True,
        is_allow_external_requests=True,
        max_playlist_size=100,
        mode="static",
        repeat_mode="none",
        mode_settings={},
        sync_playback_position=False,
        cost_mode="max",
        created_at=MagicMock(),
        updated_at=MagicMock(),
    )


@pytest.mark.asyncio
async def test_add_to_favorites_public_playlist(mock_user, mock_playlist):
    fav_repo = AsyncMock()
    plst_repo = AsyncMock()
    plst_repo.get_one.return_value = mock_playlist
    fav_repo.add_favorite.return_value = MagicMock()
    fav_repo.get_favorites_count.return_value = 1

    service = FavoritePlaylistService(fav_repo, plst_repo)
    session = AsyncMock()

    res = await service.add_to_favorites(session, mock_user, mock_playlist.id)

    assert res.playlist_id == mock_playlist.id
    assert res.is_favorite is True
    assert res.favorites_count == 1
    fav_repo.add_favorite.assert_called_once_with(session, mock_user.id, mock_playlist.id)


@pytest.mark.asyncio
async def test_add_to_favorites_private_playlist_forbidden(mock_user, mock_playlist):
    fav_repo = AsyncMock()
    plst_repo = AsyncMock()
    mock_playlist.is_public = False
    mock_playlist.owner_id = uuid4()  # different owner
    plst_repo.get_one.return_value = mock_playlist

    service = FavoritePlaylistService(fav_repo, plst_repo)
    session = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await service.add_to_favorites(session, mock_user, mock_playlist.id)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_remove_from_favorites(mock_user, mock_playlist):
    fav_repo = AsyncMock()
    plst_repo = AsyncMock()
    fav_repo.remove_favorite.return_value = True
    fav_repo.get_favorites_count.return_value = 0

    service = FavoritePlaylistService(fav_repo, plst_repo)
    session = AsyncMock()

    res = await service.remove_from_favorites(session, mock_user, mock_playlist.id)

    assert res.playlist_id == mock_playlist.id
    assert res.is_favorite is False
    assert res.favorites_count == 0
    fav_repo.remove_favorite.assert_called_once_with(session, mock_user.id, mock_playlist.id)


@pytest.mark.asyncio
async def test_get_favorite_status(mock_user, mock_playlist):
    fav_repo = AsyncMock()
    plst_repo = AsyncMock()
    fav_repo.is_favorite.return_value = True
    fav_repo.get_favorites_count.return_value = 5

    service = FavoritePlaylistService(fav_repo, plst_repo)
    session = AsyncMock()

    res = await service.get_favorite_status(session, mock_user, mock_playlist.id)

    assert res.playlist_id == mock_playlist.id
    assert res.is_favorite is True
    assert res.favorites_count == 5
