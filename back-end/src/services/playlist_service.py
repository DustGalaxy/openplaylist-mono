from src.dal.postgres.playlist import playlist_repository
from src.models.playlist import PlaylistSchema
from src.services_low.settings import get_settings_service

from src.models.auth_user import AuthUserSchema as User
from src.models.order import OrderDomain, OrderCreate, WebExtraData

from src._types import AsyncSession


async def add_to_playlist(
    session: AsyncSession, event: OrderCreate, user: User, from_owner: bool
) -> tuple[list[tuple[OrderDomain, PlaylistSchema]], list[tuple[list[str], PlaylistSchema]]]:
    settings_service = get_settings_service()

    if isinstance(event.extra_data, WebExtraData):
        playlists = [
            await playlist_repository.get_one(session, event.extra_data.playlist_id),
        ]
    else:
        playlists = await playlist_repository.get_user_playlists_by_sourse(
            session, user.id, event.owner_platform_id, event.source
        )

    tracks: list[tuple[OrderDomain, PlaylistSchema]] = []
    errors: list[tuple[list[str], PlaylistSchema]] = []

    for playlist in playlists:
        if not playlist.is_allow_external_requests and not from_owner:
            errors.append((["Playlist is not active"], playlist))
            continue

        track = await settings_service.validate_track(session, playlist, event, user) or event

        if isinstance(track, list):
            errors.append((track, playlist))
        else:
            track = await playlist_repository.add_order_to_playlist(session, playlist.id, event)
            tracks.append((track, playlist))

    return tracks, errors
