from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from simple_repository.exceptions import NotFoundException

from src._types import AsyncSession, DeleteStatus
from src.dal.postgres.playlist import PlaylistRepository, playlist_repository
from src.dto.playlist import NewPlaylist, PlaylistBaseinfo
from src.exceptions import NotAuthorizedException
from src.models.auth_user import AuthUserSchema as User
from src.models.order import OrderCreate, OrderDomain
from src.models.playlist import PlaylistCreate, PlaylistPatch, PlaylistSchema
from src.services.playlists.validation_engine import ValidationEngine


class PlaylistLowService:
    def __init__(
        self,
        _playlist_repository: PlaylistRepository,
    ):
        self._playlist_repository: PlaylistRepository = _playlist_repository

    async def get(self, session: AsyncSession, playlist_id: UUID, user: User | None = None, skip_owner_check: bool = False):
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if not skip_owner_check:
            if not user or user.id != plst.owner_id:
                raise NotAuthorizedException()
        return plst

    async def is_your_playlist_id(self, session: AsyncSession, playlist_id: UUID, user_id: UUID):
        return await self._playlist_repository.get_id_by_user_id_and_playlist_id(session, user_id, playlist_id)

    async def get_by_owner(
        self,
        session: AsyncSession,
        owner_id: UUID,
    ):
        return await self._playlist_repository.get_many(session, owner_id, column="owner_id")

    async def search_playlist(
        self, session: AsyncSession, query: str = "", tag: str | None = None
    ) -> list[PlaylistSchema]:
        plsts = await self._playlist_repository.get_by_string(session, query, tag)
        return [plst for plst in plsts if plst.is_public]

    async def get_popular_tags(self, session: AsyncSession, limit: int = 20) -> list[dict]:
        return await self._playlist_repository.get_popular_tags(session, limit)

    async def get_by_name(self, session: AsyncSession, owner_id: UUID, name: str) -> PlaylistSchema:
        return await self._playlist_repository.get_user_playlist_by_name(session, owner_id, name)

    async def get_public_playlist(self, session: AsyncSession, playlist_id: UUID, user_id: UUID | None = None) -> PlaylistSchema:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if not plst.is_public and (not user_id or plst.owner_id != user_id):
            raise HTTPException(status_code=404, detail="Playlist not found")
        return plst

    async def get_basic_info(self, session: AsyncSession, playlist_id: UUID) -> PlaylistBaseinfo:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if not plst.is_public:
            raise HTTPException(status_code=404, detail="Playlist not found")

        return PlaylistBaseinfo(
            id=plst.id,
            owner_id=plst.owner_id,
            is_public=plst.is_public,
            now_playing=plst.now_playing,
            is_allow_external_requests=plst.is_allow_external_requests,
        )

    async def new_playlist(self, session: AsyncSession, data: NewPlaylist, user: User) -> PlaylistSchema:
        try:
            await self.get_by_name(session, user.id, data.name)
            raise HTTPException(status_code=400, detail="Playlist with this name already exists")
        except NotFoundException:
            pass

        new_playlist = PlaylistCreate(
            owner_id=user.id,
            owner_nickname=user.username,
            name=data.name,
            description=data.description,
            tags=data.tags,
        )

        created_playlist = await self._playlist_repository.create_with_settings(session, new_playlist)
        return created_playlist

    async def patch_playlist(
        self,
        session: AsyncSession,
        data: PlaylistPatch,
        playlist_id: UUID,
    ) -> PlaylistSchema:
        return await self._playlist_repository.patch(session, data, playlist_id)

    async def delete_playlist(self, session: AsyncSession, playlist_id: UUID) -> int:
        res = await self._playlist_repository.remove(session, playlist_id, raise_not_found=True)
        return res

    async def delete_track_bulk(
        self, session: AsyncSession, playlist_id: UUID, ids: list[UUID], reason: DeleteStatus
    ) -> list[UUID]:
        return await self._playlist_repository.remove_orders_from_playlist(session, playlist_id, ids, reason)

    async def set_play_now(
        self, session: AsyncSession, playlist: PlaylistSchema, track_id: str | None, user: User
    ) -> OrderDomain | None:
        if playlist.now_playing == track_id:
            return await self._playlist_repository.get_play_now(session, playlist.id)

        if track_id not in [str(track.id) for track in playlist.track_data] and track_id is not None:
            raise HTTPException(detail="Track is not in playlist", status_code=status.HTTP_400_BAD_REQUEST)

        await self._playlist_repository.patch(session, PlaylistPatch(now_playing=track_id), playlist.id)
        return await self._playlist_repository.get_play_now(session, playlist.id)

    async def delete_track_from_playlist(
        self, session: AsyncSession, playlist_id: UUID, track_id: UUID, reason: DeleteStatus
    ) -> None:

        await self._playlist_repository.remove_order_from_playlist(session, playlist_id, track_id, reason)

    async def validate_track(
        self,
        playlsit: PlaylistSchema,
        new_track: OrderCreate,
        user: User,
    ) -> list[str]:

        is_vip: bool = bool(user.vip_expires_at and user.vip_expires_at > datetime.now()) or False

        validation_engine = ValidationEngine(owner_is_vip=is_vip)
        return validation_engine.validate_track(new_track, playlsit)


playlist_service = PlaylistLowService(playlist_repository)


def get_playlist_service():
    return playlist_service
