from uuid import UUID

from fastapi import HTTPException, status
from simple_repository.exceptions import NotFoundException

from src._types import AsyncSession
from src.dal.postgres.favorite_playlists import (
    FavoritePlaylistRepository,
    favorite_playlist_repository,
)
from src.dal.postgres.playlist import PlaylistRepository, playlist_repository
from src.dto.playlist import FavoriteStatusResponse, ReadPlaylistPreview
from src.models.auth_user import AuthUserSchema as User
from src.services.auth.auth_service import auth_service


class FavoritePlaylistService:
    def __init__(
        self,
        _favorite_repo: FavoritePlaylistRepository,
        _playlist_repo: PlaylistRepository,
    ):
        self._favorite_repo: FavoritePlaylistRepository = _favorite_repo
        self._playlist_repo: PlaylistRepository = _playlist_repo

    async def add_to_favorites(self, session: AsyncSession, user: User, playlist_id: UUID) -> FavoriteStatusResponse:
        try:
            plst = await self._playlist_repo.get_one(session, playlist_id)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

        if not plst.is_public and plst.owner_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

        await self._favorite_repo.add_favorite(session, user.id, playlist_id)
        count = await self._favorite_repo.get_favorites_count(session, playlist_id)
        return FavoriteStatusResponse(playlist_id=playlist_id, is_favorite=True, favorites_count=count)

    async def remove_from_favorites(self, session: AsyncSession, user: User, playlist_id: UUID) -> FavoriteStatusResponse:
        await self._favorite_repo.remove_favorite(session, user.id, playlist_id)
        count = await self._favorite_repo.get_favorites_count(session, playlist_id)
        return FavoriteStatusResponse(playlist_id=playlist_id, is_favorite=False, favorites_count=count)

    async def get_favorite_status(self, session: AsyncSession, user: User, playlist_id: UUID) -> FavoriteStatusResponse:
        is_fav = await self._favorite_repo.is_favorite(session, user.id, playlist_id)
        count = await self._favorite_repo.get_favorites_count(session, playlist_id)
        return FavoriteStatusResponse(playlist_id=playlist_id, is_favorite=is_fav, favorites_count=count)

    async def get_user_favorites(self, session: AsyncSession, user: User) -> list[ReadPlaylistPreview]:
        favorited_playlists = await self._favorite_repo.get_user_favorited_playlists(session, user.id)
        if not favorited_playlists:
            return []

        previews = []
        for p in favorited_playlists:
            owner = await auth_service.user_repo.get_one(session, p.owner_id)
            preview = ReadPlaylistPreview(
                id=p.id,
                owner_nickname=owner.username if owner.is_public else "Anon",
                name=p.name,
                description=p.description,
                favorites_count=p.favorites_count,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            previews.append(preview)

        return previews


favorite_playlist_service = FavoritePlaylistService(favorite_playlist_repository, playlist_repository)


def get_favorite_playlist_service() -> FavoritePlaylistService:
    return favorite_playlist_service
