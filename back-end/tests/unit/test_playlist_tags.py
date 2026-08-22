from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from src.dto.playlist import NewPlaylist
from src.models.auth_user import AuthUserSchema as User
from src.models.playlist import PlaylistCreate, PlaylistPatch, PlaylistSchema, sanitize_tags
from src.services.playlists.basic_service import PlaylistLowService


def test_sanitize_tags():
    # Test stripping # and whitespaces, deduplication, lowercase, max tags and length
    raw_tags = [" #Chill ", "synthwave", "#CHILL", "a" * 40, "", "   ", "hip-hop", "Lo-Fi"]
    cleaned = sanitize_tags(raw_tags)
    assert cleaned == ["chill", "synthwave", "a" * 30, "hip-hop", "lo-fi"]

    # Test None handling
    assert sanitize_tags(None) is None

    # Test limit of 10 tags
    many_tags = [f"tag{i}" for i in range(15)]
    cleaned_many = sanitize_tags(many_tags)
    assert len(cleaned_many) == 10
    assert cleaned_many[0] == "tag0"
    assert cleaned_many[9] == "tag9"


def test_playlist_models_tag_validation():
    owner_id = uuid4()
    # PlaylistCreate
    pc = PlaylistCreate(
        owner_id=owner_id,
        owner_nickname="streamer",
        name="Lofi Beats",
        tags=["#Chill", " LOFI ", "chill"],
    )
    assert pc.tags == ["chill", "lofi"]

    # PlaylistPatch
    pp = PlaylistPatch(tags=["#NightRide", "nightride", "RETRO"])
    assert pp.tags == ["nightride", "retro"]

    # PlaylistPatch with None
    pp_none = PlaylistPatch(name="Updated Name")
    assert pp_none.tags is None


@pytest.fixture
def mock_user():
    return User(
        id=uuid4(),
        username="streamer_user",
        bio="",
        email="streamer@example.com",
        email_confirmed=True,
        is_public=True,
        is_active=True,
        last_login=MagicMock(),
        created_at=MagicMock(),
        updated_at=MagicMock(),
    )


@pytest.mark.asyncio
async def test_new_playlist_with_tags(mock_user):
    repo = AsyncMock()
    repo.get_user_playlist_by_name.side_effect = Exception("Not found")  # NotFound
    from simple_repository.exceptions import NotFoundException
    repo.get_user_playlist_by_name.side_effect = NotFoundException("Not found")

    created_schema = PlaylistSchema(
        id=uuid4(),
        owner_id=mock_user.id,
        owner_nickname=mock_user.username,
        name="Vibe Playlist",
        description="Relaxing music",
        tags=["chill", "vibe"],
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
    repo.create_with_settings.return_value = created_schema

    service = PlaylistLowService(repo)
    session = AsyncMock()

    dto = NewPlaylist(name="Vibe Playlist", description="Relaxing music", tags=["#Chill", "Vibe"])
    res = await service.new_playlist(session, dto, mock_user)

    assert res.name == "Vibe Playlist"
    assert res.tags == ["chill", "vibe"]
    repo.create_with_settings.assert_called_once()
    create_arg = repo.create_with_settings.call_args[0][1]
    assert create_arg.tags == ["chill", "vibe"]


@pytest.mark.asyncio
async def test_search_playlist_with_tags(mock_user):
    repo = AsyncMock()
    p1 = PlaylistSchema(
        id=uuid4(),
        owner_id=mock_user.id,
        owner_nickname=mock_user.username,
        name="Synthwave Mix",
        description="80s retro",
        tags=["synthwave", "retro"],
        is_public=True,
        favorites_count=5,
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
    p2 = PlaylistSchema(
        id=uuid4(),
        owner_id=mock_user.id,
        owner_nickname=mock_user.username,
        name="Private Mix",
        description="Secret",
        tags=["synthwave"],
        is_public=False,
        favorites_count=0,
        is_allow_external_requests=False,
        max_playlist_size=100,
        mode="static",
        repeat_mode="none",
        mode_settings={},
        sync_playback_position=False,
        cost_mode="max",
        created_at=MagicMock(),
        updated_at=MagicMock(),
    )
    repo.get_by_string.return_value = [p1, p2]

    service = PlaylistLowService(repo)
    session = AsyncMock()

    res = await service.search_playlist(session, query="synthwave", tag="retro")
    assert len(res) == 1
    assert res[0].id == p1.id
    assert res[0].tags == ["synthwave", "retro"]
    repo.get_by_string.assert_called_once_with(session, "synthwave", "retro")


@pytest.mark.asyncio
async def test_get_popular_tags():
    repo = AsyncMock()
    repo.get_popular_tags.return_value = [
        {"tag": "chill", "count": 15},
        {"tag": "synthwave", "count": 10},
        {"tag": "anime", "count": 7},
    ]

    service = PlaylistLowService(repo)
    session = AsyncMock()

    tags = await service.get_popular_tags(session, limit=10)
    assert len(tags) == 3
    assert tags[0]["tag"] == "chill"
    assert tags[0]["count"] == 15
    repo.get_popular_tags.assert_called_once_with(session, 10)
