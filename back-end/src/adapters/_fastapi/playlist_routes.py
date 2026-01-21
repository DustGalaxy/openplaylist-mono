from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_events.dispatcher import dispatch
from simple_repository.exceptions import NotFoundException

# from adapters._rabbit.event_broker import (
#     broker,
#     main_exchange,
#     playlist_settings_changed,
#     playlist_track_playnow,
#     playlist_track_deleted,
# )
from adapters._redis.broker import redis_adapter
from database import AsyncSession, get_async_session
from dto.playlist import (
    NewPlaylist,
    PlaylistBaseinfo,
    PlayNow,
    ReadPlaylist,
    ReadPlaylistPreview,
)
from dto.settings import ReadPlaylistSettings
from models.auth_user import AuthUserDomain as User
from models.playlist import PlaylistPatch
from models.settings import PlaylistSettingsPatch
from services.auth_service import auth_service
from services.playlist_service import PlaylistService, get_playlist_service

from utils import kick
from taskiq_broker import broker as task_broker

router = APIRouter(prefix="/playlist")

DB_SESSION = Annotated[AsyncSession, Depends(get_async_session)]
PLST_SERVICE = Annotated[PlaylistService, Depends(get_playlist_service)]
CURR_USER = Annotated[User, Depends(auth_service.get_current_user)]


@router.get("/{playlist_id}/settings/privacy", status_code=status.HTTP_200_OK)
async def get_privacy_settings(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    playlist_id: UUID,
) -> Literal["public", "private"]:
    try:
        is_public = await service.get_privacy_settings(db_session, playlist_id)
        return "public" if is_public else "private"
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")


@router.patch("/{playlist_name}/settings", status_code=status.HTTP_200_OK)
async def patch_playlist_settings(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    playlist_name: str,
    patch_schema: PlaylistSettingsPatch,
) -> ReadPlaylistSettings:
    try:
        plst_settings = await service.patch_playlist_settings(db_session, patch_schema, playlist_name, current_user)

        await kick("playlist.settings_changed", task_broker, ReadPlaylistSettings.model_validate(plst_settings))
        # dispatch(
        #     event_name_or_model="playlist_settings_changed",
        #     payload=ReadPlaylistSettings.model_validate(plst_settings),
        # )

        # redis schema - {user_id}:{playlist_name}:settings
        redis_adapter.set(
            f"{current_user.id}:{playlist_name}:settings",
            plst_settings.model_dump_json(),
        )

        return ReadPlaylistSettings.model_validate(plst_settings)
    except StopIteration:
        raise HTTPException(status_code=404, detail="Playlist not found")


@router.post("/new", status_code=201)
async def create_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    data: NewPlaylist,
) -> ReadPlaylist:
    created_playlist = await service.new_playlist(db_session, data, current_user)
    return ReadPlaylist.model_validate(created_playlist)


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
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            for p in playlists
        ]
    else:
        return [ReadPlaylist.model_validate(p) for p in playlists]


@router.patch("/{playlist_id}")
async def patch_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    patch_schema: PlaylistPatch,
    playlist_id: UUID,
) -> ReadPlaylist:
    plst = await service.patch_playlist(db_session, patch_schema, playlist_id, current_user)
    return ReadPlaylist.model_validate(plst)


@router.delete("/{playlist_id}", status_code=204)
async def delete_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    playlist_id: UUID,
):
    try:
        await service.delete_playlist(db_session, playlist_id, current_user)
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"message": "Playlist deleted"}


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
    return ReadPlaylist.model_validate(plst)


@router.get("/{playlist_id}/public")
async def get_public_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    playlist_id: UUID,
) -> ReadPlaylist:
    plst = await service.get_public_playlist(db_session, playlist_id)

    return ReadPlaylist.model_validate(plst)


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


@router.patch("/{playlist_id}/playnow", status_code=status.HTTP_200_OK)
async def set_play_now_for_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    playlist_id: UUID,
    playnow: PlayNow,
) -> None:
    try:
        await service.set_play_now(db_session, playlist_id, playnow.track_id, current_user)

        await kick("playlist.track.playnow", task_broker, playnow)
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")


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


@router.get("/")
async def get_playlists(query: str, db_session: DB_SESSION, service: PLST_SERVICE) -> list[ReadPlaylistPreview]:
    res = await service.search_playlist(db_session, query)
    data = [
        ReadPlaylistPreview(
            id=p.id,
            owner_nickname=p.owner_nickname,
            name=p.name,
            description=p.description,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in res
    ]
    print(data)
    return data


@router.delete("/{playlist_id}/tracks/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_track_from_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    playlist_id: UUID,
    track_id: str,
) -> None:
    try:
        await service.delete_track_from_playlist(db_session, playlist_id, track_id, current_user)
        await kick("playlist.track.deleted", task_broker, {"track_id": track_id, "playlist_id": str(playlist_id)})
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")
