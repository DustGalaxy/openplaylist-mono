from uuid import UUID

from pydantic import BaseModel
from simple_repository import crud_factory
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src._types import PlaylistLogsEventTypes
from src.models.playlist_logs import PlaylistLogCreate, PlaylistLogSchema
from src.orm.playlist import Playlist
from src.orm.playlist_logs import PlaylistLog


class PlaylistLogsRepository(crud_factory(PlaylistLog, PlaylistLogSchema, PlaylistLogCreate, dict)):
    def to_inner(self, data: PlaylistLogCreate | PlaylistLogSchema | dict) -> dict:
        if isinstance(data, BaseModel):
            return data.model_dump(exclude_unset=True)
        return data

    def to_repr(self, object: PlaylistLog) -> PlaylistLogSchema:
        return PlaylistLogSchema.model_validate(object)

    async def get_logs(self, session: AsyncSession, playlist_id: UUID, user_id: UUID | None = None) -> list[PlaylistLogSchema]:
        stmt = select(PlaylistLog).where(PlaylistLog.playlist_id == playlist_id)
        if user_id is not None:
            stmt = stmt.where(PlaylistLog.user_id == user_id)
        stmt = stmt.order_by(PlaylistLog.created_at.asc())
        result = await session.execute(stmt)

        return [self.to_repr(item) for item in result.unique().scalars().all()]

    async def get_last_playnow(self, session: AsyncSession, user_id: UUID) -> PlaylistLogSchema | None:
        stmt = (
            select(PlaylistLog)
            .join(Playlist)
            .where(
                Playlist.show_in_widget,
                PlaylistLog.user_id == user_id,
                PlaylistLog.event_type == PlaylistLogsEventTypes.PLAY_TRACK,
            )
            .order_by(PlaylistLog.created_at.desc())
            .limit(1)
        )
        result = await session.execute(stmt)
        data = result.scalar_one_or_none()
        return self.to_repr(data) if data else None


_playlist_logs_repository = PlaylistLogsRepository()


def get_playlist_logs_repository() -> PlaylistLogsRepository:
    return _playlist_logs_repository
