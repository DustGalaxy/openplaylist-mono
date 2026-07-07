from uuid import UUID

from src.dal._redis.broker import get_broker
from src.dal.postgres.playlist import playlist_repository

from src.models.auth_user import AuthUserSchema as User

from src._types import AsyncSession
from src.dto.playback import Pause, Seek

STATE_EXPIRE_SECONDS = 60 * 60 * 24 * 3


def parse_state(state) -> dict[str, str | None]:
    if not state:
        return {"is_paused": "true", "position": "0.0", "track_id": None}
    return {
        "is_paused": str(bool(int(state["is_paused"]))),
        "position": str(float(state["position"])),
        "track_id": str(state["track_id"]),
    }


async def check_owner(session: AsyncSession, playlist_id, user_id):
    cache = get_broker().hgetall(f"playback:{playlist_id}")
    if not cache:
        playlist = await playlist_repository.get_one(session, playlist_id)
        owner_id = playlist.owner_id
    else:
        owner_id = cache.get("owner_id", None)  # ty:ignore[unresolved-attribute]
        if owner_id is None:
            playlist = await playlist_repository.get_one(session, playlist_id)
            owner_id = playlist.owner_id

    if str(owner_id) != str(user_id):
        raise PermissionError("You are not the owner of this playlist")


def save_state(playlist_id: UUID, data: dict):
    get_broker().hset(f"playback:{playlist_id}", mapping=data)
    get_broker().expire(f"playback:{playlist_id}", STATE_EXPIRE_SECONDS)


def get_state(playlist_id: UUID) -> dict[str, str | None]:
    return parse_state(get_broker().hgetall(f"playback:{playlist_id}"))


async def pause(session: AsyncSession, playlist_id: UUID, data: Pause, user_id: UUID) -> dict[str, str | None]:
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

    return get_state(playlist_id)


async def seek(session: AsyncSession, playlist_id: UUID, data: Seek, user_id: UUID) -> dict[str, str | None]:
    await check_owner(session, playlist_id, user_id)
    save_state(playlist_id, {"position": str(data.position), "track_id": str(data.track_id)})
    return get_state(playlist_id)


async def set_position_state(session: AsyncSession, playlist_id: UUID, position: float, user_id: UUID) -> None:
    await check_owner(session, playlist_id, user_id)
    save_state(playlist_id, {"position": str(position)})
