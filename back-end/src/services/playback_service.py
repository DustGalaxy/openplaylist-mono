import inspect
from uuid import UUID
from typing import TypedDict

from src.dal._redis.broker import get_broker
from src.dal.postgres.playlist import playlist_repository

from src._types import AsyncSession
from src.dto.playback import Pause, Seek

STATE_EXPIRE_SECONDS = 259200  # 60 * 60 * 24 * 3


def parse_state(state: dict[str, str]) -> TypedDict[{"is_paused": str, "position": str, "track_id": str | None}]:
    if not state:
        return {"is_paused": "True", "position": "0.0", "track_id": None}
    return {
        "is_paused": str(bool(int(state["is_paused"]))),
        "position": str(float(state["position"])),
        "track_id": str(state["track_id"]),
    }


async def get_all(playlist_id: UUID) -> dict[str, str]:
    res = get_broker().hgetall(f"playback:{playlist_id}")
    return (await res) if inspect.isawaitable(res) else res


async def check_owner(session: AsyncSession, playlist_id: UUID, user_id: UUID):
    cache: dict[str, str] = await get_all(playlist_id)
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
    get_broker().hset(f"playback:{playlist_id}", mapping=data)
    get_broker().expire(f"playback:{playlist_id}", STATE_EXPIRE_SECONDS)


async def get_state(playlist_id: UUID):
    return parse_state((await get_all(playlist_id)))


async def pause(session: AsyncSession, playlist_id: UUID, data: Pause, user_id: UUID):
    await check_owner(session, playlist_id, user_id)
    save_state(
        playlist_id,
        {
            "owner_id": str(user_id),
            "is_paused": str(int(data.is_paused)),
            "position": str(data.position),
            "track_id": str(data.track_id),
        },
    )

    return await get_state(playlist_id)


async def seek(session: AsyncSession, playlist_id: UUID, data: Seek, user_id: UUID):
    await check_owner(session, playlist_id, user_id)
    save_state(playlist_id, {"position": str(data.position), "track_id": str(data.track_id)})
    return await get_state(playlist_id)


async def set_position_state(session: AsyncSession, playlist_id: UUID, position: float, user_id: UUID) -> None:
    await check_owner(session, playlist_id, user_id)
    save_state(playlist_id, {"position": str(position)})
