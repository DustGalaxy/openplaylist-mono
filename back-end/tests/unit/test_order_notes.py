from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from simple_repository.exceptions import NotFoundException

from src.dal.postgres.order_note import OrderNoteRepository
from src.dto.order_note import OrderNoteResponse, OrderNoteUpsert
from src.orm.playlist import OrderPlaylistStatus
from src.services.playlists.order_note_service import OrderNoteService


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def sample_playlist_id():
    return uuid4()


@pytest.fixture
def sample_order_id():
    return uuid4()


@pytest.fixture
def sample_owner_id():
    return uuid4()


@pytest.fixture
def sample_stranger_id():
    return uuid4()


# --- Repository Unit Tests ---


@pytest.mark.asyncio
async def test_repo_get_note_found(mock_session, sample_playlist_id, sample_order_id):
    repo = OrderNoteRepository()
    mock_status = OrderPlaylistStatus(
        playlist_id=sample_playlist_id,
        order_id=sample_order_id,
        status="in playlist",
        note="Test Note",
        is_note_public=True,
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_status
    mock_session.execute.return_value = mock_result

    note_res = await repo.get_note(mock_session, sample_playlist_id, sample_order_id)
    assert note_res is not None
    assert note_res.note == "Test Note"
    assert note_res.is_public is True
    assert note_res.order_id == sample_order_id
    assert note_res.playlist_id == sample_playlist_id


@pytest.mark.asyncio
async def test_repo_get_note_not_found(mock_session, sample_playlist_id, sample_order_id):
    repo = OrderNoteRepository()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    note_res = await repo.get_note(mock_session, sample_playlist_id, sample_order_id)
    assert note_res is None


@pytest.mark.asyncio
async def test_repo_upsert_note_success(mock_session, sample_playlist_id, sample_order_id):
    repo = OrderNoteRepository()
    mock_status = OrderPlaylistStatus(
        playlist_id=sample_playlist_id,
        order_id=sample_order_id,
        status="in playlist",
        note=None,
        is_note_public=True,
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_status
    mock_session.execute.return_value = mock_result

    res = await repo.upsert_note(mock_session, sample_playlist_id, sample_order_id, "New Note", False)
    assert mock_status.note == "New Note"
    assert mock_status.is_note_public is False
    mock_session.commit.assert_called_once()
    assert res.note == "New Note"
    assert res.is_public is False


@pytest.mark.asyncio
async def test_repo_upsert_note_order_not_found(mock_session, sample_playlist_id, sample_order_id):
    repo = OrderNoteRepository()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    with pytest.raises(NotFoundException):
        await repo.upsert_note(mock_session, sample_playlist_id, sample_order_id, "Note", True)


@pytest.mark.asyncio
async def test_repo_delete_note_success(mock_session, sample_playlist_id, sample_order_id):
    repo = OrderNoteRepository()
    mock_status = OrderPlaylistStatus(
        playlist_id=sample_playlist_id,
        order_id=sample_order_id,
        status="in playlist",
        note="Old Note",
        is_note_public=False,
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_status
    mock_session.execute.return_value = mock_result

    success = await repo.delete_note(mock_session, sample_playlist_id, sample_order_id)
    assert success is True
    assert mock_status.note is None
    assert mock_status.is_note_public is True
    mock_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_repo_delete_note_not_found(mock_session, sample_playlist_id, sample_order_id):
    repo = OrderNoteRepository()
    mock_status = OrderPlaylistStatus(
        playlist_id=sample_playlist_id,
        order_id=sample_order_id,
        status="in playlist",
        note=None,
        is_note_public=True,
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_status
    mock_session.execute.return_value = mock_result

    with pytest.raises(NotFoundException):
        await repo.delete_note(mock_session, sample_playlist_id, sample_order_id)


# --- Service Unit Tests ---


@pytest.mark.asyncio
async def test_service_get_public_note_by_guest(mock_session, sample_playlist_id, sample_order_id, sample_owner_id):
    mock_note_repo = MagicMock()
    mock_playlist_repo = MagicMock()

    mock_playlist = MagicMock(id=sample_playlist_id, owner_id=sample_owner_id)
    mock_playlist_repo.get_one = AsyncMock(return_value=mock_playlist)
    mock_note_repo.get_note = AsyncMock(
        return_value=OrderNoteResponse(
            order_id=sample_order_id,
            playlist_id=sample_playlist_id,
            note="Public Info",
            is_public=True,
        )
    )

    service = OrderNoteService(_order_note_repo=mock_note_repo, _playlist_repo=mock_playlist_repo)
    res = await service.get_note(mock_session, sample_playlist_id, sample_order_id, user_id=None)
    assert res.note == "Public Info"
    assert res.is_public is True


@pytest.mark.asyncio
async def test_service_get_private_note_by_guest_raises_404(mock_session, sample_playlist_id, sample_order_id, sample_owner_id):
    mock_note_repo = MagicMock()
    mock_playlist_repo = MagicMock()

    mock_playlist = MagicMock(id=sample_playlist_id, owner_id=sample_owner_id)
    mock_playlist_repo.get_one = AsyncMock(return_value=mock_playlist)
    mock_note_repo.get_note = AsyncMock(
        return_value=OrderNoteResponse(
            order_id=sample_order_id,
            playlist_id=sample_playlist_id,
            note="Private Secret",
            is_public=False,
        )
    )

    service = OrderNoteService(_order_note_repo=mock_note_repo, _playlist_repo=mock_playlist_repo)
    with pytest.raises(HTTPException) as exc_info:
        await service.get_note(mock_session, sample_playlist_id, sample_order_id, user_id=None)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_service_get_private_note_by_owner_success(mock_session, sample_playlist_id, sample_order_id, sample_owner_id):
    mock_note_repo = MagicMock()
    mock_playlist_repo = MagicMock()

    mock_playlist = MagicMock(id=sample_playlist_id, owner_id=sample_owner_id)
    mock_playlist_repo.get_one = AsyncMock(return_value=mock_playlist)
    mock_note_repo.get_note = AsyncMock(
        return_value=OrderNoteResponse(
            order_id=sample_order_id,
            playlist_id=sample_playlist_id,
            note="Private Secret",
            is_public=False,
        )
    )

    service = OrderNoteService(_order_note_repo=mock_note_repo, _playlist_repo=mock_playlist_repo)
    res = await service.get_note(mock_session, sample_playlist_id, sample_order_id, user_id=sample_owner_id)
    assert res.note == "Private Secret"
    assert res.is_public is False


@pytest.mark.asyncio
async def test_service_upsert_note_by_owner_success(mock_session, sample_playlist_id, sample_order_id, sample_owner_id):
    mock_note_repo = MagicMock()
    mock_playlist_repo = MagicMock()

    mock_playlist = MagicMock(id=sample_playlist_id, owner_id=sample_owner_id)
    mock_playlist_repo.get_one = AsyncMock(return_value=mock_playlist)
    mock_note_repo.upsert_note = AsyncMock(
        return_value=OrderNoteResponse(
            order_id=sample_order_id,
            playlist_id=sample_playlist_id,
            note="Updated Note",
            is_public=True,
        )
    )

    service = OrderNoteService(_order_note_repo=mock_note_repo, _playlist_repo=mock_playlist_repo)
    res = await service.upsert_note(
        mock_session,
        sample_playlist_id,
        sample_order_id,
        sample_owner_id,
        OrderNoteUpsert(note="Updated Note", is_public=True),
    )
    assert res.note == "Updated Note"
    mock_note_repo.upsert_note.assert_called_once_with(mock_session, sample_playlist_id, sample_order_id, "Updated Note", True)


@pytest.mark.asyncio
async def test_service_upsert_note_by_stranger_raises_403(mock_session, sample_playlist_id, sample_order_id, sample_owner_id, sample_stranger_id):
    mock_note_repo = MagicMock()
    mock_playlist_repo = MagicMock()

    mock_playlist = MagicMock(id=sample_playlist_id, owner_id=sample_owner_id)
    mock_playlist_repo.get_one = AsyncMock(return_value=mock_playlist)

    service = OrderNoteService(_order_note_repo=mock_note_repo, _playlist_repo=mock_playlist_repo)
    with pytest.raises(HTTPException) as exc_info:
        await service.upsert_note(
            mock_session,
            sample_playlist_id,
            sample_order_id,
            sample_stranger_id,
            OrderNoteUpsert(note="Hacker Note", is_public=True),
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_service_delete_note_by_owner_success(mock_session, sample_playlist_id, sample_order_id, sample_owner_id):
    mock_note_repo = MagicMock()
    mock_playlist_repo = MagicMock()

    mock_playlist = MagicMock(id=sample_playlist_id, owner_id=sample_owner_id)
    mock_playlist_repo.get_one = AsyncMock(return_value=mock_playlist)
    mock_note_repo.delete_note = AsyncMock()

    service = OrderNoteService(_order_note_repo=mock_note_repo, _playlist_repo=mock_playlist_repo)
    await service.delete_note(mock_session, sample_playlist_id, sample_order_id, sample_owner_id)
    mock_note_repo.delete_note.assert_called_once_with(mock_session, sample_playlist_id, sample_order_id)


@pytest.mark.asyncio
async def test_service_delete_note_by_stranger_raises_403(mock_session, sample_playlist_id, sample_order_id, sample_owner_id, sample_stranger_id):
    mock_note_repo = MagicMock()
    mock_playlist_repo = MagicMock()

    mock_playlist = MagicMock(id=sample_playlist_id, owner_id=sample_owner_id)
    mock_playlist_repo.get_one = AsyncMock(return_value=mock_playlist)

    service = OrderNoteService(_order_note_repo=mock_note_repo, _playlist_repo=mock_playlist_repo)
    with pytest.raises(HTTPException) as exc_info:
        await service.delete_note(mock_session, sample_playlist_id, sample_order_id, sample_stranger_id)
    assert exc_info.value.status_code == 403


# --- DTO Validation Unit Tests ---


def test_order_note_upsert_validation_max_500():
    valid = OrderNoteUpsert(note="a" * 500, is_public=True)
    assert len(valid.note) == 500

    with pytest.raises(ValidationError):
        OrderNoteUpsert(note="a" * 501, is_public=True)


def test_order_note_upsert_validation_empty():
    with pytest.raises(ValidationError):
        OrderNoteUpsert(note="", is_public=True)
