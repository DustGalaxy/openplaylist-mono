from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Body
from simple_repository.exceptions import NotFoundException

from src.services.playback_service import seek, pause, set_position_state, get_state as get_playback_state

from src.utils import kick
from taskiq_broker import task_broker as task_broker

from src.adapters._fastapi.dependencies import (
    DB_SESSION,
    USER_ID,
)

from src.dto.playback import Pause, Seek


router = APIRouter(prefix="/playback")


@router.post("/{playlist_id}/state/pause", status_code=status.HTTP_200_OK)
async def post_pause_state(db_session: DB_SESSION, current_user_id: USER_ID, playlist_id: UUID, data: Pause) -> None:
    try:
        await pause(db_session, playlist_id, data, current_user_id)
        await kick("playback.pause", task_broker, str(playlist_id), str(current_user_id), data.model_dump(mode="json"))
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You are not the owner of this playlist")


@router.post("/{playlist_id}/state/seek", status_code=status.HTTP_200_OK)
async def post_seek_state(db_session: DB_SESSION, current_user_id: USER_ID, playlist_id: UUID, data: Seek) -> None:
    try:
        await seek(db_session, playlist_id, data, current_user_id)
        await kick("playback.seek", task_broker, str(playlist_id), str(current_user_id), data.model_dump(mode="json"))
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You are not the owner of this playlist")


@router.post("/{playlist_id}/state/position", status_code=status.HTTP_200_OK)
async def post_position_state(db_session: DB_SESSION, current_user: USER_ID, playlist_id: UUID, position: float = Body()) -> None:
    try:
        await set_position_state(db_session, playlist_id, position, current_user)
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You are not the owner of this playlist")


@router.get("/{playlist_id}/state", status_code=status.HTTP_200_OK)
async def get_state(playlist_id: UUID) -> dict[str, str | None]:
    return get_playback_state(playlist_id)
