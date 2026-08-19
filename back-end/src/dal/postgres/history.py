from datetime import datetime, timedelta, timezone
from uuid import UUID

from pydantic import BaseModel
from simple_repository import crud_factory
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.playback_history import (
    PlaybackHistoryCreate,
    PlaybackHistoryItemResponse,
    PlaybackHistorySchema,
)
from src.orm.playback_history import PlaybackHistory
from src.orm.playlist import Order, Playlist


class PlaybackHistoryRepository(crud_factory(PlaybackHistory, PlaybackHistorySchema, PlaybackHistoryCreate, dict)):
    def to_inner(self, data: PlaybackHistoryCreate | PlaybackHistorySchema | dict) -> dict:
        if isinstance(data, BaseModel):
            return data.model_dump(exclude_unset=True)
        return data

    def to_repr(self, object: PlaybackHistory) -> PlaybackHistorySchema:
        return PlaybackHistorySchema.model_validate(object)

    async def upsert_entry(
        self,
        session: AsyncSession,
        user_id: UUID,
        order_id: UUID,
        playlist_id: UUID,
    ) -> PlaybackHistorySchema:
        stmt = select(PlaybackHistory).where(
            PlaybackHistory.user_id == user_id,
            PlaybackHistory.order_id == order_id,
        )
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            existing.played_at = func.now()
            existing.playlist_id = playlist_id
            await session.commit()
            await session.refresh(existing)
            return self.to_repr(existing)
        else:
            new_history = PlaybackHistory(
                user_id=user_id,
                order_id=order_id,
                playlist_id=playlist_id,
            )
            session.add(new_history)
            await session.commit()
            await session.refresh(new_history)
            return self.to_repr(new_history)

    async def get_user_history(
        self,
        session: AsyncSession,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
        search: str | None = None,
    ) -> tuple[list[PlaybackHistoryItemResponse], int]:
        stmt = (
            select(PlaybackHistory, Order, Playlist.name.label("playlist_name"))
            .join(Order, PlaybackHistory.order_id == Order.id)
            .join(Playlist, PlaybackHistory.playlist_id == Playlist.id)
            .where(PlaybackHistory.user_id == user_id)
        )

        if search:
            search_filter = f"%{search.strip()}%"
            stmt = stmt.where(
                Order.title.ilike(search_filter)
                | Order.requester_nickname.ilike(search_filter)
                | Playlist.name.ilike(search_filter)
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await session.execute(count_stmt)
        total = total_res.scalar() or 0

        stmt = stmt.order_by(PlaybackHistory.played_at.desc()).limit(limit).offset(offset)
        res = await session.execute(stmt)

        items = []
        for history_obj, order_obj, pl_name in res.all():
            items.append(
                PlaybackHistoryItemResponse(
                    id=history_obj.id,
                    order_id=history_obj.order_id,
                    playlist_id=history_obj.playlist_id,
                    playlist_name=pl_name,
                    title=order_obj.title,
                    author=getattr(order_obj, "author", None) or "Unknown",
                    yt_video_id=order_obj.yt_video_id,
                    duration=order_obj.duration,
                    views=order_obj.views,
                    likes=order_obj.likes,
                    requester_nickname=order_obj.requester_nickname,
                    source=str(order_obj.source),
                    played_at=history_obj.played_at,
                )
            )
        return items, total

    async def delete_user_entry(self, session: AsyncSession, user_id: UUID, history_id: UUID) -> bool:
        stmt = delete(PlaybackHistory).where(
            PlaybackHistory.id == history_id,
            PlaybackHistory.user_id == user_id,
        )
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0

    async def clear_user_history(self, session: AsyncSession, user_id: UUID) -> int:
        stmt = delete(PlaybackHistory).where(PlaybackHistory.user_id == user_id)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount

    async def clean_old_history(self, session: AsyncSession, days: int = 90) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        stmt = delete(PlaybackHistory).where(PlaybackHistory.played_at < cutoff)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount


playback_history_repository = PlaybackHistoryRepository()


def get_playback_history_repository() -> PlaybackHistoryRepository:
    return playback_history_repository
