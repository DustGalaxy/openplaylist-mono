from src._types import AsyncSession
from src.dal.postgres.playlist import playlist_repository
from src.models.auth_user import AuthUserSchema as User
from src.models.order import OrderCreate, OrderDomain, WebExtraData
from src.models.playlist import PlaylistSchema
from src.services.playlists.basic_service import playlist_service


async def add_to_playlist(
    session: AsyncSession, event: OrderCreate, user: User, from_owner: bool
) -> tuple[list[tuple[OrderDomain, PlaylistSchema]], list[tuple[list[str], PlaylistSchema]]]:

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

        track = await playlist_service.validate_track(playlist, event, user) or event

        if isinstance(track, list):
            errors.append((track, playlist))
        else:
            track = await playlist_repository.add_order_to_playlist(session, playlist.id, event)
            tracks.append((track, playlist))

    return tracks, errors


async def add_to_playlist_batch(
    session: AsyncSession, events: list[OrderCreate], user: User, from_owner: bool
) -> tuple[list[tuple[OrderDomain, PlaylistSchema]], list[tuple[list[str], PlaylistSchema]]]:
    if not events:
        return [], []

    first_event = events[0]
    if isinstance(first_event.extra_data, WebExtraData):
        playlists = [
            await playlist_repository.get_one(session, first_event.extra_data.playlist_id),
        ]
    else:
        playlists = await playlist_repository.get_user_playlists_by_sourse(
            session, user.id, first_event.owner_platform_id, first_event.source
        )

    all_added_tracks: list[tuple[OrderDomain, PlaylistSchema]] = []
    all_errors: list[tuple[list[str], PlaylistSchema]] = []

    for playlist in playlists:
        if not playlist.is_allow_external_requests and not from_owner:
            all_errors.append((["Playlist is not active"], playlist))
            continue

        valid_events: list[OrderCreate] = []

        for event in events:
            track_res = await playlist_service.validate_track(playlist, event, user) or event
            if isinstance(track_res, list):
                all_errors.append((track_res, playlist))
            else:
                valid_events.append(event)

        if valid_events:
            added_domains = await playlist_repository.add_orders_to_playlist(session, playlist.id, valid_events)
            for domain in added_domains:
                all_added_tracks.append((domain, playlist))

    return all_added_tracks, all_errors

