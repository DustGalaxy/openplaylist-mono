from uuid import UUID

from fastapi import APIRouter, Body, HTTPException, status
from simple_repository.exceptions import NotFoundException

from src.adapters._fastapi.dependencies import (
    DB_SESSION,
    MODERATOR_ACCESS,
)
from src.adapters._rabbit.broker import main_publisher
from src.adapters._rabbit.queues import main_exchange, playback_pause_queue, playback_seek_queue
from src.dto.playback import Pause, PlaybackPauseEvent, PlaybackSeekEvent, Seek
from src.services.playback_service import get_state as get_playback_state
from src.services.playback_service import pause, seek, set_position_state

router = APIRouter(prefix="/playback")


@router.post("/{playlist_id}/state/pause", status_code=status.HTTP_200_OK)
async def post_pause_state(db_session: DB_SESSION, access: MODERATOR_ACCESS, playlist_id: UUID, data: Pause) -> None:
    if not access.permissions.get("can_manage_playback", False):
        raise HTTPException(status_code=403, detail="Moderator missing playback permissions")
    try:
        await pause(db_session, playlist_id, data, skip_owner_check=True)
        await main_publisher.publish(
            PlaybackPauseEvent(playlist_id=playlist_id, user_id=access.user_id, state=data),
            queue=playback_pause_queue,
            exchange=main_exchange,
        )
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")


@router.post("/{playlist_id}/state/seek", status_code=status.HTTP_200_OK)
async def post_seek_state(db_session: DB_SESSION, access: MODERATOR_ACCESS, playlist_id: UUID, data: Seek) -> None:
    if not access.permissions.get("can_manage_playback", False):
        raise HTTPException(status_code=403, detail="Moderator missing playback permissions")
    try:
        await seek(db_session, playlist_id, data, skip_owner_check=True)
        await main_publisher.publish(
            PlaybackSeekEvent(playlist_id=playlist_id, user_id=access.user_id, state=data),
            queue=playback_seek_queue,
            exchange=main_exchange,
        )
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")


@router.post("/{playlist_id}/state/position", status_code=status.HTTP_200_OK)
async def post_position_state(db_session: DB_SESSION, access: MODERATOR_ACCESS, playlist_id: UUID, position: float = Body(), client_id: str = Body(),) -> None:
    if not access.permissions.get("can_manage_playback", False):
        raise HTTPException(status_code=403, detail="Moderator missing playback permissions")
    try:
        await set_position_state(db_session, playlist_id, position, skip_owner_check=True)
        current_state = await get_playback_state(playlist_id)
        raw_track_id = current_state.get("track_id") if current_state else None
        track_id = UUID(raw_track_id) if raw_track_id and raw_track_id != "None" else None
        seek_data = Seek(position=position, track_id=track_id, client_id=client_id)
        await main_publisher.publish(
            PlaybackSeekEvent(playlist_id=playlist_id, user_id=access.user_id, state=seek_data),
            queue=playback_seek_queue,
            exchange=main_exchange,
        )
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")



@router.get("/{playlist_id}/state", status_code=status.HTTP_200_OK)
async def get_state(playlist_id: UUID):
    return await get_playback_state(playlist_id)

