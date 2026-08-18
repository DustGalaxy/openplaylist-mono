from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from src.adapters._rabbit.worker.history_handler import history_event_subscriber
from src.dal.postgres.history import PlaybackHistoryRepository
from src.dto.internal.domain_events import InternalPlaylistEvent, InternalPlaylistEventType
from src.models.order import OrderDomain, WebExtraData
from src._types import TrackSource


@pytest.fixture
def mock_session():
    session = AsyncMock()
    return session


@pytest.fixture
def sample_user_id():
    return uuid4()


@pytest.fixture
def sample_order_id():
    return uuid4()


@pytest.fixture
def sample_playlist_id():
    return uuid4()


@pytest.mark.asyncio
async def test_upsert_entry_creates_new_when_not_exists(mock_session, sample_user_id, sample_order_id, sample_playlist_id):
    repo = PlaybackHistoryRepository()

    # Mock DB query result scalar_one_or_none returning None
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    with patch.object(repo, "to_repr") as mock_to_repr:
        mock_to_repr.side_effect = lambda obj: obj

        result = await repo.upsert_entry(
            session=mock_session,
            user_id=sample_user_id,
            order_id=sample_order_id,
            playlist_id=sample_playlist_id,
        )

        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
        assert result.user_id == sample_user_id
        assert result.order_id == sample_order_id
        assert result.playlist_id == sample_playlist_id


@pytest.mark.asyncio
async def test_upsert_entry_updates_existing_when_present(mock_session, sample_user_id, sample_order_id, sample_playlist_id):
    repo = PlaybackHistoryRepository()

    existing_obj = MagicMock()
    existing_obj.user_id = sample_user_id
    existing_obj.order_id = sample_order_id
    existing_obj.playlist_id = uuid4()
    existing_obj.played_at = datetime.now(timezone.utc)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_obj
    mock_session.execute.return_value = mock_result

    with patch.object(repo, "to_repr") as mock_to_repr:
        mock_to_repr.side_effect = lambda obj: obj

        result = await repo.upsert_entry(
            session=mock_session,
            user_id=sample_user_id,
            order_id=sample_order_id,
            playlist_id=sample_playlist_id,
        )

        mock_session.add.assert_not_called()
        mock_session.commit.assert_called_once()
        assert existing_obj.playlist_id == sample_playlist_id


@pytest.mark.asyncio
async def test_history_rabbitmq_subscriber(sample_user_id, sample_order_id, sample_playlist_id):
    track_domain = OrderDomain(
        id=sample_order_id,
        request_id=uuid4(),
        owner_id=sample_user_id,
        from_owner=True,
        requester_nickname="TestUser",
        priority="regular",
        yt_video_id="abc123xyz",
        title="Test Track",
        duration=180,
        views=1000,
        likes=50,
        source=TrackSource.WEB,
        extra_data=WebExtraData(playlist_id=str(sample_playlist_id)),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    event = InternalPlaylistEvent(
        event_id=uuid4(),
        event_type=InternalPlaylistEventType.TRACK_PLAY,
        playlist_id=sample_playlist_id,
        playlist_name="Test Pl",
        playlist_is_public=True,
        user_id=sample_user_id,
        user_name="TestUser",
        track=track_domain,
    )

    with patch("src.adapters._rabbit.worker.history_handler.playback_history_repository.upsert_entry", new_callable=AsyncMock) as mock_upsert:
        with patch("src.adapters._rabbit.worker.history_handler.async_session_maker") as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value.__aenter__.return_value = mock_session

            await history_event_subscriber(event)

            mock_upsert.assert_called_once_with(
                session=mock_session,
                user_id=sample_user_id,
                order_id=sample_order_id,
                playlist_id=sample_playlist_id,
            )
