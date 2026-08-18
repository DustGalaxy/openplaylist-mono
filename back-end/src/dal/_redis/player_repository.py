import inspect
import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from src.dal._redis.broker import get_broker
from src.dto.player import PlayerState

STATE_EXPIRE_SECONDS = 604800  # 7 days


def parse_player_state(owner_id: UUID, state: dict[str, str | bytes]) -> PlayerState | None:
    if not state:
        return None

    # Handle string or byte keys/values from Redis
    decoded: dict[str, str] = {}
    for k, v in state.items():
        key = k.decode("utf-8") if isinstance(k, bytes) else str(k)
        val = v.decode("utf-8") if isinstance(v, bytes) else str(v)
        decoded[key] = val

    if not decoded:
        return None

    active_playlist_id = None
    if decoded.get("active_playlist_id") and decoded["active_playlist_id"] != "None":
        try:
            active_playlist_id = UUID(decoded["active_playlist_id"])
        except ValueError:
            pass

    current_track_id = decoded.get("current_track_id")
    if current_track_id == "None":
        current_track_id = None

    current_track_data = None
    if decoded.get("current_track_data") and decoded["current_track_data"] != "None":
        try:
            current_track_data = json.loads(decoded["current_track_data"])
        except Exception:
            pass

    position = 0.0
    try:
        position = float(decoded.get("position", "0.0"))
    except ValueError:
        pass

    is_paused = decoded.get("is_paused", "1") in ("1", "True", "true")
    volume = 80
    try:
        volume = int(decoded.get("volume", "80"))
    except ValueError:
        pass

    broadcast_to_widget = decoded.get("broadcast_to_widget", "1") in ("1", "True", "true")
    last_client_id = decoded.get("last_client_id")
    if last_client_id == "None":
        last_client_id = None

    updated_at = decoded.get("updated_at")

    return PlayerState(
        owner_id=owner_id,
        active_playlist_id=active_playlist_id,
        current_track_id=current_track_id,
        current_track_data=current_track_data,
        position=position,
        is_paused=is_paused,
        volume=volume,
        broadcast_to_widget=broadcast_to_widget,
        last_client_id=last_client_id,
        updated_at=updated_at,
    )


class PlayerRepository:
    """DAL Repository for UserPlayer state stored in Redis Hashes (1:1 per user)."""

    async def get_raw_state(self, owner_id: UUID) -> dict[str, Any]:
        res = get_broker().hgetall(f"player:{owner_id}")
        return (await res) if inspect.isawaitable(res) else res

    async def get_player_state(self, owner_id: UUID) -> PlayerState | None:
        raw_state = await self.get_raw_state(owner_id)
        return parse_player_state(owner_id, raw_state)

    def save_state(self, owner_id: UUID, data: dict[str, Any]) -> None:
        serialized: dict[str, str] = {}
        for k, v in data.items():
            if v is None:
                serialized[k] = "None"
            elif isinstance(v, bool):
                serialized[k] = "1" if v else "0"
            elif isinstance(v, (dict, list)):
                serialized[k] = json.dumps(v)
            else:
                serialized[k] = str(v)

        serialized["updated_at"] = datetime.now(timezone.utc).isoformat()

        get_broker().hset(f"player:{owner_id}", mapping=serialized)
        get_broker().expire(f"player:{owner_id}", STATE_EXPIRE_SECONDS)

    def clear_state(self, owner_id: UUID) -> None:
        get_broker().delete(f"player:{owner_id}")


player_repository = PlayerRepository()
