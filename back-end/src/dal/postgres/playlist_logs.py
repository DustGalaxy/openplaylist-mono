from uuid import UUID

from pydantic import BaseModel
from simple_repository import crud_factory

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.playlist_logs import PlaylistLogSchema, PlaylistLogCreate
from src.orm.playlist_logs import PlaylistLog


class PlaylistLogsRepository(crud_factory(PlaylistLog, PlaylistLogSchema, PlaylistLogCreate, dict)):
    def to_inner(self, data: PlaylistLogCreate | PlaylistLogSchema | dict) -> dict:
        if isinstance(data, BaseModel):
            return data.model_dump(exclude_unset=True)
        return data

    def to_repr(self, object: PlaylistLog) -> PlaylistLogSchema:
        return PlaylistLogSchema.model_validate(object)

    async def get_user_logs(self, user_id: UUID, session: AsyncSession) -> list[PlaylistLogSchema]:
        stmt = select(PlaylistLog).where(PlaylistLog.user_id == user_id).order_by(PlaylistLog.created_at.desc())
        result = await session.execute(stmt)

        return [self.to_repr(item) for item in result.unique().scalars().all()]


_playlist_logs_repository = PlaylistLogsRepository()


def get_playlist_logs_repository() -> PlaylistLogsRepository:
    return _playlist_logs_repository
