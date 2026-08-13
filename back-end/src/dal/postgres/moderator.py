import logging
from uuid import UUID

from simple_repository import crud_factory
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.moderator import ModeratorCreate, ModeratorPatch, PlaylistModeratorSchema
from src.orm.moderator import PlaylistModerator

logger = logging.getLogger(__name__)


class ModeratorRepository(crud_factory(PlaylistModerator, PlaylistModeratorSchema, ModeratorCreate, ModeratorPatch)):
    def to_inner(self, data: ModeratorCreate | PlaylistModeratorSchema | ModeratorPatch) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: PlaylistModerator) -> PlaylistModeratorSchema:
        return self.domain_model.model_validate(object)

    async def get_by_token(self, session: AsyncSession, token: str) -> PlaylistModeratorSchema | None:
        stmt = select(PlaylistModerator).where(
            PlaylistModerator.token == token,
            PlaylistModerator.is_active == True,
        )
        res = await session.execute(stmt)
        obj = res.scalar_one_or_none()
        if not obj:
            return None
        return PlaylistModeratorSchema.model_validate(obj)

    async def get_by_playlist_and_user(
        self, session: AsyncSession, playlist_id: UUID, user_id: UUID
    ) -> PlaylistModeratorSchema | None:
        stmt = select(PlaylistModerator).where(
            PlaylistModerator.playlist_id == playlist_id,
            PlaylistModerator.user_id == user_id,
            PlaylistModerator.is_active == True,
        )
        res = await session.execute(stmt)
        obj = res.scalar_one_or_none()
        if not obj:
            return None
        return PlaylistModeratorSchema.model_validate(obj)

    async def get_all_by_playlist(
        self, session: AsyncSession, playlist_id: UUID
    ) -> list[PlaylistModeratorSchema]:
        stmt = select(PlaylistModerator).where(
            PlaylistModerator.playlist_id == playlist_id,
        ).order_by(PlaylistModerator.created_at.desc())
        res = await session.execute(stmt)
        objs = res.scalars().all()
        return [PlaylistModeratorSchema.model_validate(x) for x in objs]

    async def get_all_by_user(
        self, session: AsyncSession, user_id: UUID
    ) -> list[PlaylistModerator]:
        stmt = (
            select(PlaylistModerator)
            .options(selectinload(PlaylistModerator.playlist))
            .where(
                PlaylistModerator.user_id == user_id,
                PlaylistModerator.is_active == True,
            )
            .order_by(PlaylistModerator.created_at.desc())
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())


moderator_repository = ModeratorRepository()
