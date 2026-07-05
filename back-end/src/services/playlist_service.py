from uuid import UUID

from src.dal._redis.broker import get_broker
from src.dal.postgres.playlist import playlist_repository
from src.services_low.settings import get_settings_service

from src.models.auth_user import AuthUserSchema as User
from src.models.playlist import PlaylistSchema
from src.models.order import OrderDomain, OrderCreate, WebExtraData

from src._types import AsyncSession


async def add_to_playlist(
    session: AsyncSession, event: OrderCreate, user: User, from_owner: bool
) -> tuple[list[tuple[OrderDomain, UUID]], list[tuple[list[str], str, UUID]]]:
    settings_service = get_settings_service()

    if isinstance(event.extra_data, WebExtraData):
        playlists = [
            await playlist_repository.get_one(session, event.extra_data.playlist_id),
        ]
    else:
        playlists = await playlist_repository.get_user_playlists_by_sourse(
            session, user.id, event.owner_platform_id, event.source
        )

    tracks: list[tuple[OrderDomain, UUID]] = []
    errors: list[tuple[list[str], str, UUID]] = []

    for playlist in playlists:
        if not playlist.is_allow_external_requests and not from_owner:
            errors.append((["Playlist is not active"], playlist.name, playlist.id))
            continue

        track = await settings_service.validate_track(session, playlist, event, user) or event

        if isinstance(track, list):
            errors.append((track, playlist.name, playlist.id))
        else:
            track = await playlist_repository.add_order_to_playlist(session, playlist.id, event)
            tracks.append((track, playlist.id))

    return tracks, errors


async def set_paused_state(session: AsyncSession, playlist_id: UUID, is_paused: bool, user: User) -> None:
    playlist = await playlist_repository.get_one(session, playlist_id)
    if playlist.owner_id != user.id:
        raise PermissionError("You are not the owner of this playlist")
    get_broker().hset(
        f"playback:{playlist_id}", mapping={"is_paused": str(int(is_paused)), "track_id": str(playlist.now_playing)}
    )
    get_broker().expire(f"playback:{playlist_id}", 60 * 60 * 24 * 3)


async def set_position_state(session: AsyncSession, playlist_id: UUID, position: float, user: User) -> None:
    playlist = await playlist_repository.get_one(session, playlist_id)
    if playlist.owner_id != user.id:
        raise PermissionError("You are not the owner of this playlist")
    get_broker().hset(f"playback:{playlist_id}", mapping={"position": str(position), "track_id": str(playlist.now_playing)})
    get_broker().expire(f"playback:{playlist_id}", 60 * 60 * 24 * 3)


async def get_playback_state(playlist_id: UUID) -> dict[str, str | None]:
    state = get_broker().hgetall(f"playback:{playlist_id}")
    if not state:
        return {"is_paused": "true", "position": "0.0", "track_id": None}
    return {
        "is_paused": str(bool(state["is_paused"])),  # ty:ignore[not-subscriptable]
        "position": str(float(state["position"])),  # ty:ignore[not-subscriptable]
        "track_id": str(state["track_id"]),  # ty:ignore[not-subscriptable]
    }
