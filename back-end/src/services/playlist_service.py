from dataclasses import MISSING
from uuid import UUID

from fastapi import HTTPException, status
from _types import AsyncSession
from simple_repository.exceptions import NotFoundException

# from adapters._elastic_search.es_adapter import elastic_adapter
from dal.abstract import IPlaylistRepository, IPlaylistSettingsRepository
from dal.postgres_impl import playlist_repository, playlist_settings_repository

from dto.events import OrderCreated
from dto.playlist import NewPlaylist, PlaylistBaseinfo
from models.auth_user import AuthUserDomain as User
from exceptions import NotAuthorizedException
from models.playlist import PlaylistCreate, PlaylistDomain, PlaylistPatch
from models.settings import PlaylistSettingsPatch, PlaylistSettingsDomain


class PlaylistService:
    def __init__(
        self,
        _playlist_repository: IPlaylistRepository,
        _playlist_settings_repository: IPlaylistSettingsRepository,
    ):
        self._playlist_repository = _playlist_repository
        self._playlist_settings_repository = _playlist_settings_repository

    async def get(self, session: AsyncSession, playlist_id: UUID, user: User):
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if user.id != plst.owner_id:
            raise NotAuthorizedException()
        return plst

    async def get_public_playlist(self, session: AsyncSession, playlist_id: UUID) -> PlaylistDomain:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if not plst.settings.is_public:
            raise HTTPException(detail="Playlist is not public", status_code=status.HTTP_403_FORBIDDEN)
        return plst

    async def get_basic_info(self, session: AsyncSession, playlist_id: UUID) -> PlaylistBaseinfo:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        return PlaylistBaseinfo(
            id=plst.id,
            now_playing=plst.now_playing,
            owner_id=plst.owner_id,
            is_active=plst.settings.is_active,
            is_public=plst.settings.is_public,
        )

    async def get_by_owner(
        self,
        session: AsyncSession,
        owner_id: UUID,
    ):
        return await self._playlist_repository.get_many(session, owner_id, column="owner_id")

    # async def get_active_streamer_playlist(self, session: AsyncSession, owner_id: UUID) -> PlaylistDomain | None:
    #     playlists = await self.get_by_streamer(session, owner_id)

    #     for playlist in playlists:
    #         if playlist.settings.is_active:
    #             return playlist

    #     return None

    async def get_by_name(self, session: AsyncSession, owner_id: UUID, name: str) -> PlaylistDomain:
        return await self._playlist_repository.get_user_playlist_by_name(session, owner_id, name)

    async def add_to_playlist(self, session: AsyncSession, event: OrderCreated) -> dict:
        playlist = await self._playlist_repository.get_user_playlist_by_name(
            session, event.owner_id, event.source
        )

        track = playlist.add_track(event)

        await self._playlist_repository.patch(
            session,
            PlaylistPatch(track_data=playlist.track_data),
            playlist.id,
        )
        return track

    async def new_playlist(self, session: AsyncSession, data: NewPlaylist, user: User) -> PlaylistDomain:
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
        # elastic_adapter.index_document(
        #     "playlists",
        #     doc_id=str(created_playlist.id),
        #     document={
        #         "playlist_name": data.name,
        #         "owner_nickname": user.username,
        #         "playlist_discription": data.description,
        #     },
        # )
        return created_playlist

    async def patch_playlist(
        self,
        session: AsyncSession,
        data: PlaylistPatch,
        playlist_id: UUID,
        user: User,
    ) -> PlaylistDomain:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if user.id != plst.owner_id:
            raise NotAuthorizedException()

        # updated_playlist = await self._playlist_repository.patch(session, data, playlist_id)
        # elastic_adapter.upd_document(
        #     "playlists",
        #     doc_id=str(playlist_id),
        #     document={
        #         "playlist_name": updated_playlist.name,
        #         "owner_nickname": updated_playlist.owner_nickname,
        #         "playlist_discription": updated_playlist.description,
        #     },
        # )
        return await self._playlist_repository.patch(session, data, playlist_id)

    async def delete_playlist(self, session: AsyncSession, playlist_id: UUID, user: User) -> int:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if user.id != plst.owner_id:
            raise NotAuthorizedException()
        res = await self._playlist_repository.remove(session, playlist_id, raise_not_found=True)
        # elastic_adapter.delete_document("playlists", doc_id=str(playlist_id))
        return res

    async def search_playlist(self, session: AsyncSession, query: str) -> list[PlaylistDomain]:
        # res, _ = elastic_adapter.search_documents(
        #     "playlists",
        #     {
        #         "multi_match": {
        #             "query": query,
        #             "fields": ["playlist_name", "playlist_discription^0.5", "owner_nickname^2"],
        #         }
        #     },
        #     sort=["_score"],
        # )

        # ids = [item["_id"] for item in res]

        plsts = await self._playlist_repository.get_by_string(session, query)
        return [plst for plst in plsts if plst.settings.is_public]

    async def get_privacy_settings(self, session: AsyncSession, playlist_id: UUID) -> bool:
        plst = await self._playlist_settings_repository.get_one(session, playlist_id, column="playlist_id")
        return plst.is_public

    async def set_play_now(self, session: AsyncSession, playlist_id: UUID, track_id: str | None, user: User) -> None:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if user.id != plst.owner_id:
            raise NotAuthorizedException()
        if plst.now_playing == track_id:
            return

        if track_id not in [track.get("id", MISSING) for track in plst.track_data] and track_id is not None:
            raise HTTPException(detail="Track is not in playlist", status_code=status.HTTP_400_BAD_REQUEST)

        await self._playlist_repository.patch(session, PlaylistPatch(now_playing=track_id), playlist_id)

    async def patch_playlist_settings(
        self,
        session: AsyncSession,
        data: PlaylistSettingsPatch,
        playlist_name: str,
        user: User,
    ) -> PlaylistSettingsDomain:
        plst_list = await self.get_by_name(session, user.id, playlist_name)

        return await self._playlist_settings_repository.patch(session, data, plst_list.settings.id)

    async def delete_track_from_playlist(
        self, session: AsyncSession, playlist_id: UUID, track_id: str, user: User
    ) -> None:
        plst = await self._playlist_repository.get_one(session, playlist_id)
        if user.id != plst.owner_id:
            raise NotAuthorizedException()

        plst.remove_track(track_id)

        await self._playlist_repository.patch(session, PlaylistPatch(track_data=plst.track_data), playlist_id)


playlist_service = PlaylistService(playlist_repository, playlist_settings_repository)


def get_playlist_service():
    return playlist_service
