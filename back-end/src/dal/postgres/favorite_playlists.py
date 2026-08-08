from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.playlist import PlaylistSchema
from src.models.user_favorite_playlist import UserFavoritePlaylistSchema
from src.orm.playlist import Playlist
from src.orm.user_favorite_playlist import UserFavoritePlaylist


class FavoritePlaylistRepository:
    async def add_favorite(self, session: AsyncSession, user_id: UUID, playlist_id: UUID) -> UserFavoritePlaylistSchema:
        try:
            stmt = select(UserFavoritePlaylist).where(
                UserFavoritePlaylist.user_id == user_id,
                UserFavoritePlaylist.playlist_id == playlist_id,
            )
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return UserFavoritePlaylistSchema.model_validate(existing)

            fav = UserFavoritePlaylist(user_id=user_id, playlist_id=playlist_id)
            session.add(fav)
            await session.execute(
                update(Playlist).where(Playlist.id == playlist_id).values(favorites_count=Playlist.favorites_count + 1)
            )
            await session.commit()
            await session.refresh(fav)
            return UserFavoritePlaylistSchema.model_validate(fav)
        except IntegrityError:
            await session.rollback()
            result = await session.execute(
                select(UserFavoritePlaylist).where(
                    UserFavoritePlaylist.user_id == user_id,
                    UserFavoritePlaylist.playlist_id == playlist_id,
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                return UserFavoritePlaylistSchema.model_validate(existing)
            raise

    async def remove_favorite(self, session: AsyncSession, user_id: UUID, playlist_id: UUID) -> bool:
        stmt = delete(UserFavoritePlaylist).where(
            UserFavoritePlaylist.user_id == user_id,
            UserFavoritePlaylist.playlist_id == playlist_id,
        )
        result = await session.execute(stmt)
        if result.rowcount > 0:
            await session.execute(
                update(Playlist)
                .where(Playlist.id == playlist_id, Playlist.favorites_count > 0)
                .values(favorites_count=Playlist.favorites_count - 1)
            )
        await session.commit()
        return result.rowcount > 0

    async def is_favorite(self, session: AsyncSession, user_id: UUID, playlist_id: UUID) -> bool:
        stmt = (
            select(func.count())
            .select_from(UserFavoritePlaylist)
            .where(
                UserFavoritePlaylist.user_id == user_id,
                UserFavoritePlaylist.playlist_id == playlist_id,
            )
        )
        result = await session.execute(stmt)
        count = result.scalar() or 0
        return count > 0

    async def get_favorites_count(self, session: AsyncSession, playlist_id: UUID) -> int:
        stmt = select(Playlist.favorites_count).where(Playlist.id == playlist_id)
        result = await session.execute(stmt)
        val = result.scalar_one_or_none()
        return val if val is not None else 0

    async def get_favorites_count_batch(self, session: AsyncSession, playlist_ids: list[UUID]) -> dict[UUID, int]:
        if not playlist_ids:
            return {}
        stmt = select(Playlist.id, Playlist.favorites_count).where(Playlist.id.in_(playlist_ids))
        result = await session.execute(stmt)
        return {pl_id: count for pl_id, count in result.all()}

    async def get_user_favorited_playlists(
        self, session: AsyncSession, user_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[PlaylistSchema]:
        stmt = (
            select(Playlist)
            .join(UserFavoritePlaylist, UserFavoritePlaylist.playlist_id == Playlist.id)
            .where(
                UserFavoritePlaylist.user_id == user_id,
                Playlist.is_public == True,  # noqa: E712
            )
            .order_by(UserFavoritePlaylist.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await session.execute(stmt)
        playlists = result.scalars().unique().all()
        return [PlaylistSchema.model_validate(p) for p in playlists]


favorite_playlist_repository = FavoritePlaylistRepository()
