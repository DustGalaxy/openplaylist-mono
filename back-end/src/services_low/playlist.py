from uuid import UUID

from fastapi import HTTPException, status
from _types import AsyncSession, DeleteStatus
from simple_repository.exceptions import NotFoundException

from dal.abstract import IPlaylistRepository
from dal.postgres_impl import playlist_repository

from dto.playlist import NewPlaylist, PlaylistBaseinfo
from models.auth_user import AuthUserSchema as User
from models.order import OrderDomain
from exceptions import NotAuthorizedException
from models.playlist import PlaylistCreate, PlaylistSchema, PlaylistPatch


class PlaylistLowService:
    def __init__(
        self,
        _playlist_repository: IPlaylistRepository,
    ):
        self._playlist_repository = _playlist_repository

    async def get(self, session: AsyncSession, playlist_id: UUID, user: User):
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if user.id != plst.owner_id:
            raise NotAuthorizedException()
        return plst

    async def get_by_owner(
        self,
        session: AsyncSession,
        owner_id: UUID,
    ):
        return await self._playlist_repository.get_many(session, owner_id, column="owner_id")

    async def search_playlist(self, session: AsyncSession, query: str) -> list[PlaylistSchema]:
        plsts = await self._playlist_repository.get_by_string(session, query)
        return [plst for plst in plsts if plst.is_public]

    async def get_by_name(self, session: AsyncSession, owner_id: UUID, name: str) -> PlaylistSchema:
        return await self._playlist_repository.get_user_playlist_by_name(session, owner_id, name)

    async def get_public_playlist(self, session: AsyncSession, playlist_id: UUID) -> PlaylistSchema:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if not plst.is_public:
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
        )

        created_playlist = await self._playlist_repository.create_with_settings(session, new_playlist)
        return created_playlist

    async def patch_playlist(
        self,
        session: AsyncSession,
        data: PlaylistPatch,
        playlist_id: UUID,
        user: User,
    ) -> PlaylistSchema:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if user.id != plst.owner_id:
            raise NotAuthorizedException()

        return await self._playlist_repository.patch(session, data, playlist_id)

    async def delete_playlist(self, session: AsyncSession, playlist_id: UUID, user: User) -> int:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if user.id != plst.owner_id:
            raise NotAuthorizedException()
        res = await self._playlist_repository.remove(session, playlist_id, raise_not_found=True)
        return res

    async def set_play_now(self, session: AsyncSession, playlist_id: UUID, track_id: str | None, user: User) -> OrderDomain | None:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if user.id != plst.owner_id:
            raise NotAuthorizedException()
        if plst.now_playing == track_id:
            return await self._playlist_repository.get_play_now(session, playlist_id)

        if track_id not in [str(track.id) for track in plst.track_data] and track_id is not None:
            raise HTTPException(detail="Track is not in playlist", status_code=status.HTTP_400_BAD_REQUEST)

        await self._playlist_repository.patch(session, PlaylistPatch(now_playing=track_id), playlist_id)
        return await self._playlist_repository.get_play_now(session, playlist_id)

    async def delete_track_from_playlist(
        self, session: AsyncSession, playlist_id: UUID, track_id: UUID, user: User, reason: DeleteStatus
    ) -> None:
        await self._playlist_repository.remove_order_from_playlist(session, playlist_id, track_id, user.id, reason)


playlist_service = PlaylistLowService(playlist_repository)


def get_playlist_service():
    return playlist_service
