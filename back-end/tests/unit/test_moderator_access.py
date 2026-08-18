from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from src.dto.moderator import CreateChannelModeratorTokenRequest, DirectAddChannelModeratorRequest, GrantPlaylistAccessRequest
from src.models.moderator import ChannelModeratorSchema, ModeratorPlaylistAccessSchema
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
async def test_channel_owner_gets_full_access(mock_owner_id):
    mod_repo = AsyncMock()
    access_repo = AsyncMock()
    plst_repo = AsyncMock()

    service = ModeratorService(mod_repo=mod_repo, access_repo=access_repo, plst_repo=plst_repo)
    db_session = AsyncMock()

    access = await service.get_channel_access_info(
        db_session=db_session,
        owner_id=mock_owner_id,
        user_id=mock_owner_id,
    )

    assert access.access_level == "owner"
    assert access.can_control_player is True
    assert access.can_manage_all_playlists is True


@pytest.mark.asyncio
async def test_channel_moderator_token_access(mock_owner_id):
    mod_repo = AsyncMock()
    access_repo = AsyncMock()
    plst_repo = AsyncMock()

    valid_token = "mod_valid123"
    mod_schema = ChannelModeratorSchema(
        id=uuid4(),
        owner_id=mock_owner_id,
        user_id=None,
        name="Channel Mod 1",
        token=valid_token,
        can_control_player=True,
        can_manage_all_playlists=False,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mod_repo.get_by_token.return_value = mod_schema

    service = ModeratorService(mod_repo=mod_repo, access_repo=access_repo, plst_repo=plst_repo)
    db_session = AsyncMock()

    access = await service.get_channel_access_info(
        db_session=db_session,
        owner_id=mock_owner_id,
        token=valid_token,
    )

    assert access.access_level == "moderator"
    assert access.can_control_player is True
    assert access.can_manage_all_playlists is False


@pytest.mark.asyncio
async def test_playlist_access_via_granular_grant(mock_playlist_id, mock_owner_id, mock_playlist):
    mod_repo = AsyncMock()
    access_repo = AsyncMock()
    plst_repo = AsyncMock()
    plst_repo.get_one.return_value = mock_playlist

    mod_user_id = uuid4()
    mod_schema = ChannelModeratorSchema(
        id=uuid4(),
        owner_id=mock_owner_id,
        user_id=mod_user_id,
        name="Granular Mod",
        token="mod_grant_token",
        can_control_player=True,
        can_manage_all_playlists=False,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mod_repo.get_by_owner_and_user.return_value = mod_schema

    access_schema = ModeratorPlaylistAccessSchema(
        id=uuid4(),
        moderator_id=mod_schema.id,
        playlist_id=mock_playlist_id,
        can_manage_tracks=True,
        can_manage_settings=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    access_repo.get_by_mod_and_playlist.return_value = access_schema

    service = ModeratorService(mod_repo=mod_repo, access_repo=access_repo, plst_repo=plst_repo)
    db_session = AsyncMock()

    plst_access = await service.get_playlist_access_info(
        db_session=db_session,
        playlist_id=mock_playlist_id,
        user_id=mod_user_id,
    )

    assert plst_access.access_level == "moderator"
    assert plst_access.can_manage_tracks is True
    assert plst_access.can_manage_settings is False


@pytest.mark.asyncio
async def test_expired_token_rejected(mock_owner_id):
    mod_repo = AsyncMock()
    access_repo = AsyncMock()
    plst_repo = AsyncMock()

    expired_token = "mod_expired"
    mod_schema = ChannelModeratorSchema(
        id=uuid4(),
        owner_id=mock_owner_id,
        user_id=None,
        name="Expired Mod",
        token=expired_token,
        can_control_player=True,
        can_manage_all_playlists=True,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        is_active=True,
        created_at=datetime.now(timezone.utc) - timedelta(days=2),
        updated_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    mod_repo.get_by_token.return_value = mod_schema

    service = ModeratorService(mod_repo=mod_repo, access_repo=access_repo, plst_repo=plst_repo)
    db_session = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await service.get_channel_access_info(
            db_session=db_session,
            owner_id=mock_owner_id,
            token=expired_token,
        )
    assert exc_info.value.status_code == 403
