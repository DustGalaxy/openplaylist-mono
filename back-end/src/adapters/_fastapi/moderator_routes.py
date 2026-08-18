from uuid import UUID

from fastapi import APIRouter, Query, status

from src.adapters._fastapi.dependencies import (
    CURR_USER,
    DB_SESSION,
    MODERATOR_SERVICE,
    PLAYLIST_ACCESS,
)
from src.dto.moderator import (
    ChannelModeratorResponse,
    CreateChannelModeratorTokenRequest,
    DirectAddChannelModeratorRequest,
    GrantPlaylistAccessRequest,
    ModeratedChannelResponse,
    ModeratorPlaylistAccessInfo,
    PlaylistAccessResponse,
    UpdateChannelModeratorRequest,
)

channel_router = APIRouter(prefix="/channel/moderators", tags=["Channel Moderators"])
playlist_mod_router = APIRouter(prefix="/playlist/{playlist_id}/moderators", tags=["Playlist Moderators"])


@channel_router.post("/token", status_code=status.HTTP_201_CREATED)
async def create_channel_moderator_token(
    db_session: DB_SESSION,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
    data: CreateChannelModeratorTokenRequest,
) -> ChannelModeratorResponse:
    return await service.create_channel_moderator_token(
        db_session=db_session,
        owner_id=current_user.id,
        data=data,
    )


@channel_router.post("/user", status_code=status.HTTP_201_CREATED)
async def add_channel_moderator_by_user_id(
    db_session: DB_SESSION,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
    data: DirectAddChannelModeratorRequest,
) -> ChannelModeratorResponse:
    return await service.add_channel_moderator_by_user_id(
        db_session=db_session,
        owner_id=current_user.id,
        data=data,
    )


@channel_router.post("/claim", status_code=status.HTTP_200_OK)
async def claim_channel_moderator_token(
    db_session: DB_SESSION,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
    token: str = Query(...),
) -> ChannelModeratorResponse:
    return await service.claim_channel_moderator_token(
        db_session=db_session,
        current_user_id=current_user.id,
        token=token,
    )


@channel_router.patch("/{moderator_id}", status_code=status.HTTP_200_OK)
async def patch_channel_moderator(
    db_session: DB_SESSION,
    moderator_id: UUID,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
    data: UpdateChannelModeratorRequest,
) -> ChannelModeratorResponse:
    return await service.patch_channel_moderator(
        db_session=db_session,
        owner_id=current_user.id,
        moderator_id=moderator_id,
        data=data,
    )


@channel_router.delete("/{moderator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_channel_moderator(
    db_session: DB_SESSION,
    moderator_id: UUID,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
) -> None:
    await service.revoke_channel_moderator(
        db_session=db_session,
        owner_id=current_user.id,
        moderator_id=moderator_id,
    )


@channel_router.get("", status_code=status.HTTP_200_OK)
async def list_channel_moderators(
    db_session: DB_SESSION,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
) -> list[ChannelModeratorResponse]:
    return await service.list_channel_moderators(
        db_session=db_session,
        owner_id=current_user.id,
    )


@channel_router.get("/moderated", status_code=status.HTTP_200_OK)
async def list_moderated_channels(
    db_session: DB_SESSION,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
) -> list[ModeratedChannelResponse]:
    return await service.list_moderated_channels(
        db_session=db_session,
        user_id=current_user.id,
    )


@channel_router.post("/{moderator_id}/playlists", status_code=status.HTTP_200_OK)
async def grant_playlist_access(
    db_session: DB_SESSION,
    moderator_id: UUID,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
    data: GrantPlaylistAccessRequest,
) -> PlaylistAccessResponse:
    return await service.grant_playlist_access(
        db_session=db_session,
        owner_id=current_user.id,
        moderator_id=moderator_id,
        data=data,
    )


@channel_router.delete("/{moderator_id}/playlists/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_playlist_access(
    db_session: DB_SESSION,
    moderator_id: UUID,
    playlist_id: UUID,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
) -> None:
    await service.revoke_playlist_access(
        db_session=db_session,
        owner_id=current_user.id,
        moderator_id=moderator_id,
        playlist_id=playlist_id,
    )


@playlist_mod_router.get("/access", status_code=status.HTTP_200_OK)
async def get_playlist_moderator_access(
    access_info: PLAYLIST_ACCESS,
) -> ModeratorPlaylistAccessInfo:
    return access_info


router = channel_router
