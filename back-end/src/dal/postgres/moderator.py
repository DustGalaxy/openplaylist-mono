import logging
from uuid import UUID

from simple_repository import crud_factory
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.moderator import (
    ChannelModeratorCreate,
    ChannelModeratorPatch,
    ChannelModeratorSchema,
    ModeratorPlaylistAccessCreate,
    ModeratorPlaylistAccessPatch,
    ModeratorPlaylistAccessSchema,
)
from src.orm.moderator import ChannelModerator, ModeratorPlaylistAccess

logger = logging.getLogger(__name__)


class ChannelModeratorRepository(crud_factory(ChannelModerator, ChannelModeratorSchema, ChannelModeratorCreate, ChannelModeratorPatch)):
    def to_inner(self, data: ChannelModeratorCreate | ChannelModeratorSchema | ChannelModeratorPatch) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: ChannelModerator) -> ChannelModeratorSchema:
        return self.domain_model.model_validate(object)

    async def get_by_token(self, session: AsyncSession, token: str) -> ChannelModeratorSchema | None:
        stmt = (
            select(ChannelModerator)
            .options(selectinload(ChannelModerator.playlist_access))
            .where(
                ChannelModerator.token == token,
                ChannelModerator.is_active == True,
            )
        )
        res = await session.execute(stmt)
        obj = res.scalar_one_or_none()
        if not obj:
            return None
        return ChannelModeratorSchema.model_validate(obj)

    async def get_by_owner_and_user(
        self, session: AsyncSession, owner_id: UUID, user_id: UUID
    ) -> ChannelModeratorSchema | None:
        stmt = (
            select(ChannelModerator)
            .options(selectinload(ChannelModerator.playlist_access))
            .where(
                ChannelModerator.owner_id == owner_id,
                ChannelModerator.user_id == user_id,
                ChannelModerator.is_active == True,
            )
        )
        res = await session.execute(stmt)
        obj = res.scalar_one_or_none()
        if not obj:
            return None
        return ChannelModeratorSchema.model_validate(obj)

    async def get_all_by_owner(
        self, session: AsyncSession, owner_id: UUID
    ) -> list[ChannelModeratorSchema]:
        stmt = (
            select(ChannelModerator)
            .options(selectinload(ChannelModerator.playlist_access))
            .where(ChannelModerator.owner_id == owner_id)
            .order_by(ChannelModerator.created_at.desc())
        )
        res = await session.execute(stmt)
        objs = res.scalars().all()
        return [ChannelModeratorSchema.model_validate(x) for x in objs]

    async def get_all_by_moderator_user(
        self, session: AsyncSession, user_id: UUID
    ) -> list[ChannelModerator]:
        stmt = (
            select(ChannelModerator)
            .options(
                selectinload(ChannelModerator.owner),
                selectinload(ChannelModerator.playlist_access).selectinload(ModeratorPlaylistAccess.playlist),
            )
            .where(
                ChannelModerator.user_id == user_id,
                ChannelModerator.is_active == True,
            )
            .order_by(ChannelModerator.created_at.desc())
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())


class ModeratorPlaylistAccessRepository(
    crud_factory(
        ModeratorPlaylistAccess,
        ModeratorPlaylistAccessSchema,
        ModeratorPlaylistAccessCreate,
        ModeratorPlaylistAccessPatch,
    )
):
    def to_inner(
        self,
        data: ModeratorPlaylistAccessCreate | ModeratorPlaylistAccessSchema | ModeratorPlaylistAccessPatch,
    ) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: ModeratorPlaylistAccess) -> ModeratorPlaylistAccessSchema:
        return self.domain_model.model_validate(object)

    async def get_by_mod_and_playlist(
        self, session: AsyncSession, moderator_id: UUID, playlist_id: UUID
    ) -> ModeratorPlaylistAccessSchema | None:
        stmt = select(ModeratorPlaylistAccess).where(
            ModeratorPlaylistAccess.moderator_id == moderator_id,
            ModeratorPlaylistAccess.playlist_id == playlist_id,
        )
        res = await session.execute(stmt)
        obj = res.scalar_one_or_none()
        if not obj:
            return None
        return ModeratorPlaylistAccessSchema.model_validate(obj)

    async def get_all_by_moderator(
        self, session: AsyncSession, moderator_id: UUID
    ) -> list[ModeratorPlaylistAccessSchema]:
        stmt = select(ModeratorPlaylistAccess).where(
            ModeratorPlaylistAccess.moderator_id == moderator_id
        )
        res = await session.execute(stmt)
        objs = res.scalars().all()
        return [ModeratorPlaylistAccessSchema.model_validate(x) for x in objs]


channel_moderator_repository = ChannelModeratorRepository()
moderator_playlist_access_repository = ModeratorPlaylistAccessRepository()
