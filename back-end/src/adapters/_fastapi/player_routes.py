from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from src.adapters._fastapi.dependencies import (
    CHANNEL_MODERATOR_ACCESS,
    DB_SESSION,
    PLAYER_SERVICE,
)
from src.dto.player import (
    PlayerBroadcastRequest,
    PlayerPauseRequest,
    PlayerPlayRequest,
    PlayerSeekRequest,
    PlayerState,
    PlayerVolumeRequest,
)

router = APIRouter(prefix="/player", tags=["Player"])


@router.get("/{owner_id}/state", status_code=status.HTTP_200_OK)
async def get_player_state(
    owner_id: UUID,
    player_service: PLAYER_SERVICE,
) -> PlayerState | None:
    return await player_service.get_state(owner_id)


@router.post("/{owner_id}/play", status_code=status.HTTP_200_OK)
async def post_player_play(
    db_session: DB_SESSION,
    access: CHANNEL_MODERATOR_ACCESS,
    player_service: PLAYER_SERVICE,
    owner_id: UUID,
    data: PlayerPlayRequest,
) -> PlayerState:
    if not access.can_control_player:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing permission to control player")
    return await player_service.play_track(db_session, owner_id, data)


@router.post("/{owner_id}/pause", status_code=status.HTTP_200_OK)
async def post_player_pause(
    access: CHANNEL_MODERATOR_ACCESS,
    player_service: PLAYER_SERVICE,
    owner_id: UUID,
    data: PlayerPauseRequest,
) -> PlayerState | None:
    if not access.can_control_player:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing permission to control player")
    return await player_service.pause(owner_id, data)


@router.post("/{owner_id}/seek", status_code=status.HTTP_200_OK)
async def post_player_seek(
    access: CHANNEL_MODERATOR_ACCESS,
    player_service: PLAYER_SERVICE,
    owner_id: UUID,
    data: PlayerSeekRequest,
) -> PlayerState | None:
    if not access.can_control_player:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing permission to control player")
    return await player_service.seek(owner_id, data)


@router.post("/{owner_id}/volume", status_code=status.HTTP_200_OK)
async def post_player_volume(
    access: CHANNEL_MODERATOR_ACCESS,
    player_service: PLAYER_SERVICE,
    owner_id: UUID,
    data: PlayerVolumeRequest,
) -> PlayerState | None:
    if not access.can_control_player:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing permission to control player")
    return await player_service.set_volume(owner_id, data)


@router.post("/{owner_id}/broadcast_widget", status_code=status.HTTP_200_OK)
async def post_player_broadcast_widget(
    access: CHANNEL_MODERATOR_ACCESS,
    player_service: PLAYER_SERVICE,
    owner_id: UUID,
    data: PlayerBroadcastRequest,
) -> PlayerState | None:
    if not access.can_control_player:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing permission to control player")
    return await player_service.set_broadcast_to_widget(owner_id, data)
