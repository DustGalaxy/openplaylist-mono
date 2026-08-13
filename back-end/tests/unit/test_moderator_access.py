from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from src.dto.moderator import DirectAddModeratorRequest, UpdateModeratorRequest
from src.models.moderator import PlaylistModeratorSchema
from src.models.playlist import PlaylistSchema
from src.services.playlists.moderator_service import ModeratorService


@pytest.fixture
def mock_owner_id():
    return uuid4()


@pytest.fixture
def mock_playlist_id():
    return uuid4()


@pytest.fixture
def mock_playlist(mock_playlist_id, mock_owner_id):
    return PlaylistSchema(
        id=mock_playlist_id,
        owner_id=mock_owner_id,
        owner_nickname="owner",
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
async def test_owner_gets_full_access_priority(mock_playlist_id, mock_owner_id, mock_playlist):
    mod_repo = AsyncMock()
    plst_repo = AsyncMock()
    plst_repo.get_one.return_value = mock_playlist

    service = ModeratorService(mod_repo=mod_repo, plst_repo=plst_repo)
    db_session = AsyncMock()

    access = await service.get_access_info(
        db_session=db_session,
        playlist_id=mock_playlist_id,
        user_id=mock_owner_id,
        token="some_token",  # Even if token is passed, owner priority wins!
    )

    assert access.access_level == "owner"
    assert access.permissions["can_manage_queue"] is True
    assert access.permissions["can_manage_playback"] is True
    assert access.permissions["can_manage_settings"] is True


@pytest.mark.asyncio
async def test_valid_token_access(mock_playlist_id, mock_owner_id, mock_playlist):
    mod_repo = AsyncMock()
    plst_repo = AsyncMock()
    plst_repo.get_one.return_value = mock_playlist

    valid_token = "mod_valid123"
    mod_schema = PlaylistModeratorSchema(
        id=uuid4(),
        playlist_id=mock_playlist_id,
        user_id=None,
        name="Operator Stream 1",
        token=valid_token,
        permissions={
            "can_manage_queue": True,
            "can_manage_playback": True,
            "can_manage_settings": False,
        },
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mod_repo.get_by_token.return_value = mod_schema

    service = ModeratorService(mod_repo=mod_repo, plst_repo=plst_repo)
    db_session = AsyncMock()

    access = await service.get_access_info(
        db_session=db_session,
        playlist_id=mock_playlist_id,
        user_id=None,
        token=valid_token,
    )

    assert access.access_level == "moderator"
    assert access.name == "Operator Stream 1"
    assert access.permissions["can_manage_queue"] is True
    assert access.permissions["can_manage_playback"] is True
    assert access.permissions["can_manage_settings"] is False


@pytest.mark.asyncio
async def test_claimed_token_rejects_anonymous_token_access(mock_playlist_id, mock_playlist):
    mod_repo = AsyncMock()
    plst_repo = AsyncMock()
    plst_repo.get_one.return_value = mock_playlist

    claimed_token = "mod_claimed123"
    mod_schema = PlaylistModeratorSchema(
        id=uuid4(),
        playlist_id=mock_playlist_id,
        user_id=uuid4(),  # Already claimed by user
        name="Bound Moderator",
        token=claimed_token,
        permissions={"can_manage_queue": True, "can_manage_playback": True, "can_manage_settings": False},
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mod_repo.get_by_token.return_value = mod_schema

    service = ModeratorService(mod_repo=mod_repo, plst_repo=plst_repo)
    db_session = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await service.get_access_info(
            db_session=db_session,
            playlist_id=mock_playlist_id,
            user_id=None,
            token=claimed_token,
        )

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_owner_cannot_claim_token(mock_playlist_id, mock_owner_id, mock_playlist):
    mod_repo = AsyncMock()
    plst_repo = AsyncMock()
    plst_repo.get_one.return_value = mock_playlist

    service = ModeratorService(mod_repo=mod_repo, plst_repo=plst_repo)
    db_session = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await service.claim_moderator_token(
            db_session=db_session,
            playlist_id=mock_playlist_id,
            current_user_id=mock_owner_id,
            token="mod_token123",
        )

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_get_user_moderated_playlists(mock_playlist_id, mock_playlist):
    mod_repo = AsyncMock()
    plst_repo = AsyncMock()
    user_id = uuid4()

    mock_mod = MagicMock()
    mock_mod.id = uuid4()
    mock_mod.playlist = mock_playlist
    mock_mod.permissions = {"can_manage_queue": True, "can_manage_playback": True}
    mock_mod.expires_at = None

    mod_repo.get_all_by_user.return_value = [mock_mod]

    service = ModeratorService(mod_repo=mod_repo, plst_repo=plst_repo)
    db_session = AsyncMock()

    res = await service.get_user_moderated_playlists(db_session, user_id)
    assert len(res) == 1
    assert res[0].playlist.id == mock_playlist_id
    assert res[0].permissions["can_manage_queue"] is True



@pytest.mark.asyncio
async def test_expired_token_raises_403(mock_playlist_id, mock_playlist):
    mod_repo = AsyncMock()
    plst_repo = AsyncMock()
    plst_repo.get_one.return_value = mock_playlist

    expired_token = "mod_expired123"
    mod_schema = PlaylistModeratorSchema(
        id=uuid4(),
        playlist_id=mock_playlist_id,
        user_id=None,
        name="Expired Operator",
        token=expired_token,
        permissions={"can_manage_queue": True, "can_manage_playback": True, "can_manage_settings": False},
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mod_repo.get_by_token.return_value = mod_schema

    service = ModeratorService(mod_repo=mod_repo, plst_repo=plst_repo)
    db_session = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await service.get_access_info(
            db_session=db_session,
            playlist_id=mock_playlist_id,
            user_id=None,
            token=expired_token,
        )

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_invalid_token_raises_403(mock_playlist_id):
    mod_repo = AsyncMock()
    plst_repo = AsyncMock()
    mod_repo.get_by_token.return_value = None

    service = ModeratorService(mod_repo=mod_repo, plst_repo=plst_repo)
    db_session = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await service.get_access_info(
            db_session=db_session,
            playlist_id=mock_playlist_id,
            user_id=None,
            token="invalid_token",
        )

    assert exc_info.value.status_code == 403

