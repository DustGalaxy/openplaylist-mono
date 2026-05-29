from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from simple_repository.exceptions import NotFoundException

from dto.playlist import (
    NewPlaylist,
    PlaylistBaseinfo,
    PlayNow,
    ReadPlaylist,
    ReadPlaylistPreview,
)
from models.playlist import PlaylistPatch, PlaylistSchema
from models.settings import SettingsSchema
from services.playlist_log import playlist_log_service


from utils import kick, find
from _types import DeleteStatus, PlaylistLogsEventTypes
from taskiq_broker import task_broker as task_broker
from .dependencies import CURR_USER, DB_SESSION, PLST_SERVICE, SETTINGS_SERVICE as SE

router = APIRouter(prefix="/playlist")


# --- basic operations ---


@router.get("")
async def get_playlists(
    query: str,
    db_session: DB_SESSION,
    service: PLST_SERVICE,
) -> list[ReadPlaylistPreview]:
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
    return data


@router.post("", status_code=201)
async def create_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    settings_service: SE,
    current_user: CURR_USER,
    data: NewPlaylist,
) -> ReadPlaylist:
    created_playlist = await service.new_playlist(db_session, data, current_user)
    settings = await settings_service.get_by_plst(db_session, created_playlist.id, current_user.id)

    result = created_playlist.model_dump()
    result["settings"] = settings.model_dump()

    return ReadPlaylist.model_validate(result)


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


@router.get("/me")
async def get_my_playlists(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    settings_service: SE,
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
        ids = [p.id for p in playlists]
        settings = await settings_service.repository.get_many(db_session, ids, "playlist_id")
        my_zip: list[tuple[PlaylistSchema, SettingsSchema]] = []
        for id in ids:
            s = find(settings, lambda x: x.playlist_id == id)
            p = find(playlists, lambda x: x.id == id)
            if s is not None and p is not None:
                my_zip.append((p, s))

        result = []
        for p, s in my_zip:
            result.append(p.model_dump())
            result[-1]["settings"] = s.model_dump()

        return [ReadPlaylist.model_validate(p) for p in result]


@router.get("/{playlist_id}")
async def get_playlist_data(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    settings_service: SE,
    current_user: CURR_USER,
    playlist_id: UUID,
) -> ReadPlaylist:
    try:
        plst = await service.get(db_session, playlist_id, current_user)
        settings = await settings_service.get_by_plst(db_session, plst.id, current_user.id)
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")
    result = plst.model_dump()
    result["settings"] = settings.model_dump()

    return ReadPlaylist.model_validate(result)


# --- public playlist operations ---


@router.get("/{playlist_id}/public")
async def get_public_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    playlist_id: UUID,
    settings_service: SE,
) -> ReadPlaylist:
    plst = await service.get_public_playlist(db_session, playlist_id)
    settings = await settings_service.get_by_plst(db_session, plst.id, plst.owner_id)
    res = plst.model_dump()
    res["settings"] = settings.model_dump()

    return ReadPlaylist.model_validate(res)


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
    current_user: CURR_USER,
    playlist_id: UUID,
    playnow: PlayNow,
) -> None:
    try:
        await service.set_play_now(db_session, playlist_id, playnow.track_id, current_user)

        await kick("playlist.track.playnow", task_broker, playnow)
        await playlist_log_service.log_and_emit(
            db_session,
            current_user.id,
            playlist_id,
            PlaylistLogsEventTypes.PLAY_TRACK,
            {"details": f"Update current playing track to {playnow.track_id}"},
        )
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")


@router.delete("/{playlist_id}/track/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_track_from_playlist(
    db_session: DB_SESSION,
    service: PLST_SERVICE,
    current_user: CURR_USER,
    playlist_id: UUID,
    track_id: UUID,
    reason: DeleteStatus = "listened",
) -> None:
    try:
        await service.delete_track_from_playlist(db_session, playlist_id, track_id, current_user, reason)
        await kick("playlist.track.deleted", task_broker, {"track_id": track_id, "playlist_id": str(playlist_id)})
    except NotFoundException:
        raise HTTPException(status_code=404, detail="Playlist not found")
