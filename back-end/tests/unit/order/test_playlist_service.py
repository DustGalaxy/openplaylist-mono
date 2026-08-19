"""
Unit tests for src/services/playlist_service.py :: add_to_playlist

Covered cases:
  1. WebExtraData path  – single playlist fetched by playlist_id
  2. Non-WebExtraData   – playlists fetched by source/platform
  3. External requests blocked (is_allow_external_requests=False, from_owner=False)
  4. Owner bypasses external-request restriction (from_owner=True)
  5. Validation failure  – validate_track returns a non-empty list of errors
  6. Validation passes   – track added successfully (validate_track returns [])
  7. Mixed playlists     – one blocked, one valid → both tracks and errors populated
  8. Empty playlist list – nothing to process, both results are empty
  9. validate_track returns falsy (empty list) – treated as "no errors", event used as track
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_playlist(
    *,
    is_allow_external_requests: bool = True,
    name: str = "My Playlist",
    playlist_id=None,
):
    """Return a minimal playlist-like MagicMock."""
    pl = MagicMock()
    pl.id = playlist_id or uuid4()
    pl.name = name
    pl.is_allow_external_requests = is_allow_external_requests
    return pl


def _make_event(*, web_extra_data: bool = False, playlist_id=None):
    """Return a minimal OrderCreate-like MagicMock."""
    from unittest.mock import MagicMock

    event = MagicMock()
    event.owner_platform_id = "platform_user_1"
    event.source = "twitch"

    if web_extra_data:
        # Make isinstance(event.extra_data, WebExtraData) return True
        from src.models.order import WebExtraData  # noqa: F401 (import only for spec)

        extra = MagicMock(spec=WebExtraData)
        extra.playlist_id = playlist_id or uuid4()
        event.extra_data = extra
    else:
        # Any other type – must NOT be an instance of WebExtraData
        event.extra_data = MagicMock(spec=object)

    return event


def _make_user(*, user_id=None):
    user = MagicMock()
    user.id = user_id or uuid4()
    return user


def _make_order_domain(*, track_id=None, playlist_id=None):
    od = MagicMock()
    od.id = track_id or uuid4()
    od.playlist_id = playlist_id or uuid4()
    return od


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_session():
    return MagicMock()


@pytest.fixture
def mock_settings_service():
    svc = AsyncMock()
    # Default: validation passes (returns empty list → falsy)
    svc.validate_track = AsyncMock(return_value=[])
    return svc


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_web_extra_data_fetches_single_playlist_by_id(mock_session, mock_settings_service, mocker):
    """WebExtraData → get_one called with extra_data.playlist_id, NOT get_user_playlists_by_sourse."""
    playlist_id = uuid4()
    playlist = _make_playlist(playlist_id=playlist_id)
    event = _make_event(web_extra_data=True, playlist_id=playlist_id)
    user = _make_user()
    order_domain = _make_order_domain()

    mock_repo = AsyncMock()
    mock_repo.get_one = AsyncMock(return_value=playlist)
    mock_repo.add_order_to_playlist = AsyncMock(return_value=order_domain)

    mocker.patch("src.services.playlist_service.playlist_repository", mock_repo)
    mocker.patch("src.services.playlist_service.playlist_service", mock_settings_service)

    from src.services.playlist_service import add_to_playlist

    tracks, errors = await add_to_playlist(mock_session, event, user, from_owner=False)

    mock_repo.get_one.assert_awaited_once_with(mock_session, playlist_id)
    mock_repo.get_user_playlists_by_sourse.assert_not_called()
    assert len(tracks) == 1
    assert tracks[0] == (order_domain, playlist)

    assert errors == []


@pytest.mark.asyncio
async def test_non_web_extra_data_fetches_by_source(mock_session, mock_settings_service, mocker):
    """Non-WebExtraData → get_user_playlists_by_sourse called with correct args."""
    playlist = _make_playlist()
    event = _make_event(web_extra_data=False)
    user = _make_user()
    order_domain = _make_order_domain()

    mock_repo = AsyncMock()
    mock_repo.get_user_playlists_by_sourse = AsyncMock(return_value=[playlist])
    mock_repo.add_order_to_playlist = AsyncMock(return_value=order_domain)

    mocker.patch("src.services.playlist_service.playlist_repository", mock_repo)
    mocker.patch("src.services.playlist_service.playlist_service", mock_settings_service)

    from src.services.playlist_service import add_to_playlist

    tracks, errors = await add_to_playlist(mock_session, event, user, from_owner=False)

    mock_repo.get_user_playlists_by_sourse.assert_awaited_once_with(mock_session, user.id, event.owner_platform_id, event.source)
    mock_repo.get_one.assert_not_called()
    assert len(tracks) == 1
    assert errors == []


@pytest.mark.asyncio
async def test_external_requests_blocked_when_not_from_owner(mock_session, mock_settings_service, mocker):
    """Playlist with is_allow_external_requests=False and from_owner=False → error, no track added."""
    playlist = _make_playlist(is_allow_external_requests=False, name="Locked Playlist")
    event = _make_event(web_extra_data=False)
    user = _make_user()

    mock_repo = AsyncMock()
    mock_repo.get_user_playlists_by_sourse = AsyncMock(return_value=[playlist])

    mocker.patch("src.services.playlist_service.playlist_repository", mock_repo)
    mocker.patch("src.services.playlist_service.playlist_service", mock_settings_service)

    from src.services.playlist_service import add_to_playlist

    tracks, errors = await add_to_playlist(mock_session, event, user, from_owner=False)

    assert tracks == []
    assert len(errors) == 1
    err_msgs, err_pl = errors[0]
    assert err_msgs == ["Playlist is not active"]
    assert err_pl == playlist

    # validate_track must NOT have been called (we short-circuit before it)
    mock_settings_service.validate_track.assert_not_called()
    mock_repo.add_order_to_playlist.assert_not_called()


@pytest.mark.asyncio
async def test_owner_bypasses_external_request_restriction(mock_session, mock_settings_service, mocker):
    """Playlist with is_allow_external_requests=False but from_owner=True → track added."""
    playlist = _make_playlist(is_allow_external_requests=False)
    event = _make_event(web_extra_data=False)
    user = _make_user()
    order_domain = _make_order_domain()

    mock_repo = AsyncMock()
    mock_repo.get_user_playlists_by_sourse = AsyncMock(return_value=[playlist])
    mock_repo.add_order_to_playlist = AsyncMock(return_value=order_domain)

    mocker.patch("src.services.playlist_service.playlist_repository", mock_repo)
    mocker.patch("src.services.playlist_service.playlist_service", mock_settings_service)

    from src.services.playlist_service import add_to_playlist

    tracks, errors = await add_to_playlist(mock_session, event, user, from_owner=True)

    assert errors == []
    assert len(tracks) == 1
    assert tracks[0] == (order_domain, playlist)


@pytest.mark.asyncio
async def test_validation_failure_adds_error(mock_session, mocker):
    """validate_track returns non-empty list → appended to errors, nothing added to repo."""
    playlist = _make_playlist(name="Strict Playlist")
    event = _make_event(web_extra_data=False)
    user = _make_user()
    validation_errors = ["Not enough views", "Too long"]

    mock_settings_service = AsyncMock()
    mock_settings_service.validate_track = AsyncMock(return_value=validation_errors)

    mock_repo = AsyncMock()
    mock_repo.get_user_playlists_by_sourse = AsyncMock(return_value=[playlist])

    mocker.patch("src.services.playlist_service.playlist_repository", mock_repo)
    mocker.patch("src.services.playlist_service.playlist_service", mock_settings_service)

    from src.services.playlist_service import add_to_playlist

    tracks, errors = await add_to_playlist(mock_session, event, user, from_owner=False)

    assert tracks == []
    assert len(errors) == 1
    err_msgs, err_pl = errors[0]
    assert err_msgs == validation_errors
    assert err_pl == playlist
    mock_repo.add_order_to_playlist.assert_not_called()


@pytest.mark.asyncio
async def test_validation_passes_track_added(mock_session, mock_settings_service, mocker):
    """validate_track returns [] → add_order_to_playlist called, track in result."""
    playlist = _make_playlist()
    event = _make_event(web_extra_data=False)
    user = _make_user()
    order_domain = _make_order_domain()

    mock_repo = AsyncMock()
    mock_repo.get_user_playlists_by_sourse = AsyncMock(return_value=[playlist])
    mock_repo.add_order_to_playlist = AsyncMock(return_value=order_domain)

    mocker.patch("src.services.playlist_service.playlist_repository", mock_repo)
    mocker.patch("src.services.playlist_service.playlist_service", mock_settings_service)

    from src.services.playlist_service import add_to_playlist

    tracks, errors = await add_to_playlist(mock_session, event, user, from_owner=False)

    mock_repo.add_order_to_playlist.assert_awaited_once_with(mock_session, playlist.id, event)
    assert errors == []
    assert tracks == [(order_domain, playlist)]


@pytest.mark.asyncio
async def test_mixed_playlists_one_blocked_one_valid(mock_session, mock_settings_service, mocker):
    """Two playlists: first locked (error), second open and valid (track added)."""
    locked = _make_playlist(is_allow_external_requests=False, name="Locked")
    open_pl = _make_playlist(is_allow_external_requests=True, name="Open")
    event = _make_event(web_extra_data=False)
    user = _make_user()
    order_domain = _make_order_domain()

    mock_repo = AsyncMock()
    mock_repo.get_user_playlists_by_sourse = AsyncMock(return_value=[locked, open_pl])
    mock_repo.add_order_to_playlist = AsyncMock(return_value=order_domain)

    mocker.patch("src.services.playlist_service.playlist_repository", mock_repo)
    mocker.patch("src.services.playlist_service.playlist_service", mock_settings_service)

    from src.services.playlist_service import add_to_playlist

    tracks, errors = await add_to_playlist(mock_session, event, user, from_owner=False)

    assert len(errors) == 1
    assert errors[0][1] == locked

    assert len(tracks) == 1
    assert tracks[0] == (order_domain, open_pl)



@pytest.mark.asyncio
async def test_empty_playlist_list_returns_empty_results(mock_session, mock_settings_service, mocker):
    """No playlists found → both tracks and errors are empty lists."""
    event = _make_event(web_extra_data=False)
    user = _make_user()

    mock_repo = AsyncMock()
    mock_repo.get_user_playlists_by_sourse = AsyncMock(return_value=[])

    mocker.patch("src.services.playlist_service.playlist_repository", mock_repo)
    mocker.patch("src.services.playlist_service.playlist_service", mock_settings_service)

    from src.services.playlist_service import add_to_playlist

    tracks, errors = await add_to_playlist(mock_session, event, user, from_owner=False)

    assert tracks == []
    assert errors == []
    mock_settings_service.validate_track.assert_not_called()


@pytest.mark.asyncio
async def test_validate_track_returns_none_treated_as_no_errors(mock_session, mocker):
    """validate_track returning None (falsy) → `track = None or event` → event used, track added."""
    playlist = _make_playlist()
    event = _make_event(web_extra_data=False)
    user = _make_user()
    order_domain = _make_order_domain()

    # Returning None is falsy: `track = None or event` → event
    mock_settings_service = AsyncMock()
    mock_settings_service.validate_track = AsyncMock(return_value=None)

    mock_repo = AsyncMock()
    mock_repo.get_user_playlists_by_sourse = AsyncMock(return_value=[playlist])
    mock_repo.add_order_to_playlist = AsyncMock(return_value=order_domain)

    mocker.patch("src.services.playlist_service.playlist_repository", mock_repo)
    mocker.patch("src.services.playlist_service.playlist_service", mock_settings_service)

    from src.services.playlist_service import add_to_playlist

    tracks, errors = await add_to_playlist(mock_session, event, user, from_owner=False)

    # None is falsy → track becomes `event`; isinstance(event, list) is False → add_order called
    mock_repo.add_order_to_playlist.assert_awaited_once_with(mock_session, playlist.id, event)
    assert errors == []
    assert len(tracks) == 1


@pytest.mark.asyncio
async def test_validate_track_called_with_correct_args(mock_session, mock_settings_service, mocker):
    """Ensure validate_track receives (session, playlist, event, user) in order."""
    playlist = _make_playlist()
    event = _make_event(web_extra_data=False)
    user = _make_user()
    order_domain = _make_order_domain()

    mock_repo = AsyncMock()
    mock_repo.get_user_playlists_by_sourse = AsyncMock(return_value=[playlist])
    mock_repo.add_order_to_playlist = AsyncMock(return_value=order_domain)

    mocker.patch("src.services.playlist_service.playlist_repository", mock_repo)
    mocker.patch("src.services.playlist_service.playlist_service", mock_settings_service)

    from src.services.playlist_service import add_to_playlist

    await add_to_playlist(mock_session, event, user, from_owner=False)

    mock_settings_service.validate_track.assert_awaited_once_with(playlist, event, user)


@pytest.mark.asyncio
async def test_multiple_valid_playlists_all_tracks_added(mock_session, mock_settings_service, mocker):
    """Three open playlists all pass validation → three tracks returned."""
    playlists = [_make_playlist(name=f"PL-{i}") for i in range(3)]
    event = _make_event(web_extra_data=False)
    user = _make_user()
    order_domains = [_make_order_domain() for _ in range(3)]

    mock_repo = AsyncMock()
    mock_repo.get_user_playlists_by_sourse = AsyncMock(return_value=playlists)
    mock_repo.add_order_to_playlist = AsyncMock(side_effect=order_domains)

    mocker.patch("src.services.playlist_service.playlist_repository", mock_repo)
    mocker.patch("src.services.playlist_service.playlist_service", mock_settings_service)

    from src.services.playlist_service import add_to_playlist

    tracks, errors = await add_to_playlist(mock_session, event, user, from_owner=False)

    assert errors == []
    assert len(tracks) == 3
    for i, (od, pl) in enumerate(tracks):
        assert od == order_domains[i]
        assert pl == playlists[i]

