from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, status
from simple_repository.exceptions import NotFoundException

from src._types import DeleteStatus
from src.adapters._fastapi.dependencies import (
    CURR_USER,
    DB_SESSION,
    FAVORITE_SERVICE,
    MODERATOR_ACCESS,
    MODERATOR_SERVICE,
    PLST_LOG_SERVICE,
    PLST_SERVICE,
    USER_ID_OR_NONE,
)
from src.adapters._rabbit.broker import get_broker, main_publisher
from src.adapters._rabbit.queues import playlist_fanout_exchange
from src.dal._redis.playback_repository import playback_repository
from src.dto.internal.domain_events import EventOperator, InternalPlaylistEvent, InternalPlaylistEventType, PlaylistSettings
from src.dto.moderator import UserModeratedPlaylistResponse
from src.dto.playlist import (
    FavoriteStatusResponse,
    NewPlaylist,
    PlaylistBaseinfo,
    PlayNow,
    ReadPlaylist,
    ReadPlaylistPreview,
    TrackDeleteBulk,
)
from src.dto.playlist_log import ReadPlaylistLog
from src.models.playlist import PlaylistPatch
from src.services.auth.auth_service import auth_service
from src.services.permitions.permition_service import check_feature
from src.utils import find

router = APIRouter(prefix="/playlist")


# --- basic operations ---


@router.get("")
async def get_playlists(
    query: str,
    db_session: DB_SESSION,
    service: PLST_SERVICE,
) -> list[ReadPlaylistPreview]:
    res = await service.search_playlist(db_session, query)
    if not res:
        return []

    data = []
    for p in res:
        user = await auth_service.user_repo.get_one(db_session, p.owner_id)
        instance = ReadPlaylistPreview(
            id=p.id,
            owner_nickname=p.owner_nickname if user.is_public else "Anon",
            name=p.name,
            description=p.description,
            favorites_count=p.favorites_count,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        data.append(instance)

    return data


@router.post("", status_code=201)
async def create_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    data: NewPlaylist,
) -> ReadPlaylist:
    created_playlist = await service.new_playlist(db_session, data, current_user)

    await main_publisher.publish(
        InternalPlaylistEvent(
            event_id=uuid4(),
            event_type=InternalPlaylistEventType.PLAYLIST_CREATED,
            playlist_id=created_playlist.id,
            playlist_name=created_playlist.name,
            playlist_is_public=created_playlist.is_public,
            show_in_widget=created_playlist.show_in_widget,
            user_id=current_user.id,
            user_name=current_user.username,
            operator=EventOperator(user_id=current_user.id, nickname=current_user.username, access_level="owner"),
        ),
        exchange=playlist_fanout_exchange,
    )
    return ReadPlaylist.model_validate(created_playlist)


@router.patch("/{playlist_id}")
async def patch_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    access: MODERATOR_ACCESS,
    patch_schema: PlaylistPatch,
    playlist_id: UUID,
) -> ReadPlaylist:
    if not access.permissions.get("can_manage_settings", False):
        raise HTTPException(status_code=403, detail="Moderator missing can_manage_settings permission")
    plst = await service.get(db_session, playlist_id, skip_owner_check=True)
    new_plst = await service.patch_playlist(db_session, patch_schema, playlist_id)

    await main_publisher.publish(
        InternalPlaylistEvent(
            event_id=uuid4(),
            event_type=InternalPlaylistEventType.PLAYLIST_SETTINGS_CHANGED,
            playlist_id=playlist_id,
            playlist_name=plst.name,
            playlist_is_public=plst.is_public,
            show_in_widget=plst.show_in_widget,
            user_id=plst.owner_id,
            user_name=access.name,
            operator=EventOperator(
                user_id=access.user_id,
                nickname=access.name,
                access_level=access.access_level if access.access_level in ("owner", "moderator", "none") else "none",
            ),
            playlist_data=PlaylistSettings.model_validate(new_plst),
        ),
        exchange=playlist_fanout_exchange,
    )

    return ReadPlaylist.model_validate(new_plst)


@router.delete("/{playlist_id}", status_code=204)
async def delete_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    playlist_id: UUID,
):
    try:
        plst = await service.get(db_session, playlist_id, current_user)
        await main_publisher.publish(
            InternalPlaylistEvent(
                event_id=uuid4(),
                event_type=InternalPlaylistEventType.PLAYLIST_DELETED,
                playlist_id=playlist_id,
                playlist_name=plst.name,
                playlist_is_public=plst.is_public,
                show_in_widget=plst.show_in_widget,
                user_id=current_user.id,
                user_name=current_user.username,
                operator=EventOperator(user_id=current_user.id, nickname=current_user.username, access_level="owner"),
            ),
            exchange=playlist_fanout_exchange,
        )
        await service.delete_playlist(db_session, playlist_id)
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"message": "Playlist deleted"}


@router.get("/me")
async def get_my_playlists(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    preview: bool = False,
) -> list[ReadPlaylistPreview] | list[ReadPlaylist]:
    playlists = await service.get_by_owner(db_session, current_user.id)

    if preview:
        return [
            ReadPlaylistPreview(
                id=p.id,
                owner_nickname=p.owner_nickname,
                name=p.name,
                description=p.description,
                favorites_count=p.favorites_count,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            for p in playlists
        ]
    else:
        return [ReadPlaylist.model_validate(p) for p in playlists]


@router.get("/moderating/me", status_code=status.HTTP_200_OK)
async def get_my_moderated_playlists(
    db_session: DB_SESSION,
    current_user: CURR_USER,
    mod_service: MODERATOR_SERVICE,
) -> list[UserModeratedPlaylistResponse]:
    return await mod_service.get_user_moderated_playlists(db_session, current_user.id)



@router.get("/{playlist_id}")
async def get_playlist_data(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    playlist_id: UUID,
) -> ReadPlaylist:
    try:
        plst = await service.get(db_session, playlist_id, current_user)
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")

    res = ReadPlaylist.model_validate(plst)
    return res


# --- public playlist operations ---


@router.get("/{playlist_id}/public")
async def get_public_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    playlist_id: UUID,
    user_id_or_none: USER_ID_OR_NONE,
) -> ReadPlaylist:
    plst = await service.get_public_playlist(db_session, playlist_id, user_id_or_none)
    res = ReadPlaylist.model_validate(plst)
    return res


@router.get("/{playlist_id}/logs")
async def get_logs(
    db_session: DB_SESSION,
    service: PLST_LOG_SERVICE,
    access: MODERATOR_ACCESS,
    playlist_id: UUID,
) -> list[ReadPlaylistLog]:
    if access.access_level == "none":
        HTTPException(status.HTTP_403_FORBIDDEN)
        
    logs = await service.get_logs(db_session, playlist_id)

    return [ReadPlaylistLog.model_validate(log) for log in logs]


@router.get("/{playlist_id}/baseinfo")
async def get_playlist_baseinfo(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    playlist_id: UUID,
) -> PlaylistBaseinfo:
    try:
        basic_info = await service.get_basic_info(db_session, playlist_id)
        return basic_info
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")


# --- tracks operations ---


@router.get("/{playlist_id}/playnow", status_code=status.HTTP_200_OK)
async def get_play_now_for_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    playlist_id: UUID,
) -> str | None:
    try:
        basic_info = await service.get_basic_info(db_session, playlist_id)
        return basic_info.now_playing
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")


@router.patch("/{playlist_id}/playnow", status_code=status.HTTP_200_OK)
async def set_play_now_for_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    access: MODERATOR_ACCESS,
    playlist_id: UUID,
    playnow: PlayNow,
) -> None:
    if not (access.permissions.get("can_manage_playback", False) or access.permissions.get("can_manage_queue", False)):
        raise HTTPException(status_code=403, detail="Moderator missing playback/queue permissions")
    try:
        plst = await service.get(db_session, playlist_id, skip_owner_check=True)
        order = await service.set_play_now(db_session, plst, playnow.track_id, None)
        playback_repository.save_state(
            playlist_id,
            {"track_id": str(playnow.track_id) if playnow.track_id else "None", "position": "0.0"},
        )
        await get_broker().publish(
            InternalPlaylistEvent(
                event_id=uuid4(),
                event_type=InternalPlaylistEventType.TRACK_PLAY,
                playlist_id=playlist_id,
                playlist_name=plst.name,
                playlist_is_public=plst.is_public,
                show_in_widget=plst.show_in_widget,
                user_id=plst.owner_id,
                user_name=access.name,
                operator=EventOperator(
                    user_id=access.user_id,
                    nickname=access.name,
                    access_level=access.access_level if access.access_level in ("owner", "moderator", "none") else "none",
                ),
                track=order,
            ),
            exchange=playlist_fanout_exchange,
        )
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")


@router.delete("/{playlist_id}/track/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_track_from_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    access: MODERATOR_ACCESS,
    playlist_id: UUID,
    track_id: UUID,
    reason: DeleteStatus = "listened",
) -> None:
    if not access.permissions.get("can_manage_queue", False):
        raise HTTPException(status_code=403, detail="Moderator missing can_manage_queue permission")
    try:
        playlist = await service.get(db_session, playlist_id, skip_owner_check=True)
        order_to_delete = find(playlist.track_data, lambda x: x.id == track_id)

        if not order_to_delete:
            return None

        await service.delete_track_from_playlist(db_session, playlist_id, track_id, reason)
        await get_broker().publish(
            InternalPlaylistEvent(
                event_id=uuid4(),
                event_type=InternalPlaylistEventType(f"track.{reason}"),
                playlist_id=playlist_id,
                playlist_name=playlist.name,
                playlist_is_public=playlist.is_public,
                show_in_widget=playlist.show_in_widget,
                user_id=playlist.owner_id,
                user_name=access.name,
                operator=EventOperator(
                    user_id=access.user_id,
                    nickname=access.name,
                    access_level=access.access_level if access.access_level in ("owner", "moderator", "none") else "none",
                ),
                track=order_to_delete,
            ),
            exchange=playlist_fanout_exchange,
        )
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")


@router.post("/{playlist_id}/track/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tracks_from_playlist(
    db_session: DB_SESSION, service: PLST_SERVICE, access: MODERATOR_ACCESS, playlist_id: UUID, data: TrackDeleteBulk
) -> None:
    if not access.permissions.get("can_manage_queue", False):
        raise HTTPException(status_code=403, detail="Moderator missing can_manage_queue permission")
    try:
        playlist = await service.get(db_session, playlist_id, skip_owner_check=True)
        deleted = await service.delete_track_bulk(db_session, playlist_id, data.track_ids, data.reason)
        if deleted:
            await get_broker().publish(
                InternalPlaylistEvent(
                    event_id=uuid4(),
                    event_type=InternalPlaylistEventType.TRACK_REMOVED_BULK,
                    playlist_id=playlist_id,
                    playlist_name=playlist.name,
                    playlist_is_public=playlist.is_public,
                    show_in_widget=playlist.show_in_widget,
                    user_id=playlist.owner_id,
                    user_name=access.name,
                    operator=EventOperator(
                        user_id=access.user_id,
                        nickname=access.name,
                        access_level=access.access_level if access.access_level in ("owner", "moderator", "none") else "none",
                    ),
                    bulk_ids=deleted,
                ),
                exchange=playlist_fanout_exchange,
            )
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")


# --- favorite playlist operations ---


@router.get("/favorites/me")
async def get_my_favorite_playlists(
    db_session: DB_SESSION,
    current_user: CURR_USER,
    favorite_service: FAVORITE_SERVICE,
) -> list[ReadPlaylistPreview]:
    return await favorite_service.get_user_favorites(db_session, current_user)


@router.post("/{playlist_id}/favorite")
async def add_playlist_to_favorites(
    playlist_id: UUID,
    db_session: DB_SESSION,
    current_user: CURR_USER,
    favorite_service: FAVORITE_SERVICE,
) -> FavoriteStatusResponse:
    return await favorite_service.add_to_favorites(db_session, current_user, playlist_id)


@router.delete("/{playlist_id}/favorite")
async def remove_playlist_from_favorites(
    playlist_id: UUID,
    db_session: DB_SESSION,
    current_user: CURR_USER,
    favorite_service: FAVORITE_SERVICE,
) -> FavoriteStatusResponse:
    return await favorite_service.remove_from_favorites(db_session, current_user, playlist_id)


@router.get("/{playlist_id}/is-favorite")
async def check_playlist_is_favorite(
    playlist_id: UUID,
    db_session: DB_SESSION,
    current_user: CURR_USER,
    favorite_service: FAVORITE_SERVICE,
) -> FavoriteStatusResponse:
    return await favorite_service.get_favorite_status(db_session, current_user, playlist_id)
