from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from src.dal.postgres.playlist_logs import PlaylistLogsRepository
from src.models.playlist_logs import PlaylistLogSchema
from src.services.playlist_log import PlaylistLogService


@pytest.fixture
def mock_playlist_id():
    return uuid4()


@pytest.fixture
def mock_user_id():
    return uuid4()


@pytest.fixture
def mock_log(mock_playlist_id, mock_user_id):
    return PlaylistLogSchema(
        id=uuid4(),
        user_id=mock_user_id,
        playlist_id=mock_playlist_id,
        event_type="play_track",
        event_data={"track_id": "123"},
        created_at=datetime.now(timezone.utc),
    )


@pytest.mark.asyncio
async def test_get_logs_repository_without_user_id(mock_playlist_id, mock_log):
    repo = PlaylistLogsRepository()
    session = AsyncMock()

    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [
        MagicMock(
            id=mock_log.id,
            user_id=mock_log.user_id,
            playlist_id=mock_log.playlist_id,
            event_type=mock_log.event_type,
            event_data=mock_log.event_data,
            created_at=mock_log.created_at,
        )
    ]
    unique_mock = MagicMock()
    unique_mock.scalars.return_value = scalars_mock
    result_mock = MagicMock()
    result_mock.unique.return_value = unique_mock
    session.execute.return_value = result_mock

    logs = await repo.get_logs(session, playlist_id=mock_playlist_id)

    assert len(logs) == 1
    assert logs[0].playlist_id == mock_playlist_id
    assert logs[0].user_id == mock_log.user_id


@pytest.mark.asyncio
async def test_playlist_log_service_get_logs_without_user_id(mocker, mock_playlist_id, mock_log):
    mock_repo = AsyncMock()
    mock_repo.get_logs.return_value = [mock_log]

    mocker.patch(
        "src.services.playlist_log.get_playlist_logs_repository",
        return_value=mock_repo,
    )

    service = PlaylistLogService()
    session = AsyncMock()

    logs = await service.get_logs(session, playlist_id=mock_playlist_id)

    assert len(logs) == 1
    assert logs[0].playlist_id == mock_playlist_id
    mock_repo.get_logs.assert_called_once_with(session, mock_playlist_id, None)
