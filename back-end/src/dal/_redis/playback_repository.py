import inspect
from typing import TypedDict
from uuid import UUID

from src.dal._redis.broker import get_broker

STATE_EXPIRE_SECONDS = 259200  # 3 days

State = TypedDict("State", {"is_paused": str, "position": str, "track_id": str | None})


def parse_state(state: dict[str, str]) -> State:
    if not state:
        return {"is_paused": "True", "position": "0.0", "track_id": None}
    return {
        "is_paused": str(bool(int(state.get("is_paused", "1")))),
        "position": str(float(state.get("position", "0.0"))),
        "track_id": str(state["track_id"]) if state.get("track_id") and state["track_id"] != "None" else None,
    }


class PlaybackRepository:
    """DAL Repository for Playback state stored in Redis Hashes."""

    async def get_all(self, playlist_id: UUID) -> dict[str, str]:
        res = get_broker().hgetall(f"playback:{playlist_id}")
        return (await res) if inspect.isawaitable(res) else res

    def save_state(self, playlist_id: UUID, data: dict[str, str]) -> None:
        get_broker().hset(f"playback:{playlist_id}", mapping=data)
        get_broker().expire(f"playback:{playlist_id}", STATE_EXPIRE_SECONDS)

    async def get_state(self, playlist_id: UUID) -> State:
        raw_state = await self.get_all(playlist_id)
        return parse_state(raw_state)


playback_repository = PlaybackRepository()
