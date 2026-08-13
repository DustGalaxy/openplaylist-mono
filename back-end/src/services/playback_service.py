from uuid import UUID
from typing import TypedDict

from src.dal._redis.playback_repository import playback_repository, parse_state
from src.dal.postgres.playlist import playlist_repository
from src._types import AsyncSession
from src.dto.playback import Pause, Seek

State = TypedDict("State", {"is_paused": str, "position": str, "track_id": str | None})


async def get_all(playlist_id: UUID) -> dict[str, str]:
    return await playback_repository.get_all(playlist_id)


async def check_owner(session: AsyncSession, playlist_id: UUID, user_id: UUID):
    cache: dict[str, str] = await playback_repository.get_all(playlist_id)
    if not cache:
        playlist = await playlist_repository.get_one(session, playlist_id)
        owner_id = playlist.owner_id
    else:
        owner_id = cache.get("owner_id", None)
        if owner_id is None:
            playlist = await playlist_repository.get_one(session, playlist_id)
            owner_id = playlist.owner_id

    if str(owner_id) != str(user_id):
        raise PermissionError("You are not the owner of this playlist")


def save_state(playlist_id: UUID, data: dict[str, str]):
    playback_repository.save_state(playlist_id, data)


async def get_state(playlist_id: UUID):
    return await playback_repository.get_state(playlist_id)


async def pause(session: AsyncSession, playlist_id: UUID, data: Pause, user_id: UUID | None = None, skip_owner_check: bool = False):
    if not skip_owner_check and user_id:
        await check_owner(session, playlist_id, user_id)
    playback_repository.save_state(
        playlist_id,
        {
            "is_paused": str(int(data.is_paused)),
            "position": str(data.position),
            "track_id": str(data.track_id),
        },
    )
    return await get_state(playlist_id)


async def seek(session: AsyncSession, playlist_id: UUID, data: Seek, user_id: UUID | None = None, skip_owner_check: bool = False):
    if not skip_owner_check and user_id:
        await check_owner(session, playlist_id, user_id)
    playback_repository.save_state(playlist_id, {"position": str(data.position), "track_id": str(data.track_id)})
    return await get_state(playlist_id)


async def set_position_state(session: AsyncSession, playlist_id: UUID, position: float, user_id: UUID | None = None, skip_owner_check: bool = False) -> None:
    if not skip_owner_check and user_id:
        await check_owner(session, playlist_id, user_id)
    playback_repository.save_state(playlist_id, {"position": str(position)})


