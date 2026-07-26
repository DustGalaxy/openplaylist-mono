from uuid import UUID

from simple_repository import crud_factory
from simple_repository.abctract import IdValue
from simple_repository.exceptions import IntegrityConflictException, RepositoryException, NotFoundException

from sqlalchemy import func, literal, or_, select, update, cast
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

from src.models.playlist import (
    ContentSettingsCreate,
    DonationRulesCreate,
    PlaylistSchema,
    PlaylistCreate,
    PlaylistPatch,
)
from src.orm.playlist import ContentSettings, DonationRules, OrderPlaylistStatus, Playlist, Order
from src.models.order import OrderCreate, OrderDomain
from src.dal.abstract import IPlaylistRepository
from src.exceptions import NotActivePlaylist


from src._types import DonationRuleScope, TrackSource, DeleteStatus, ContentSettingScope


class PlaylistRepository(
    crud_factory(Playlist, PlaylistSchema, PlaylistCreate, PlaylistPatch),
    IPlaylistRepository,
):
    def to_repr(self, object: Playlist) -> PlaylistSchema:
        return self.domain_model.model_validate(object)

    def to_inner(self, data: PlaylistCreate | PlaylistSchema | PlaylistPatch) -> dict:
        return data.model_dump(exclude_unset=True)

    async def get_play_now(self, session: AsyncSession, playlist_id: UUID) -> OrderDomain | None:
        stmt = select(Order).where(Playlist.id == playlist_id, cast(Playlist.now_playing, PostgresUUID) == Order.id)
        result = await session.execute(stmt)
        result = result.unique().scalar_one_or_none()
        if not result:
            return None

        return OrderDomain.model_validate(result)

    async def get_id_by_user_id_and_playlist_id(
        self, session: AsyncSession, user_id: UUID, playlist_id: UUID
    ) -> UUID | None:
        stmt = select(Playlist.id).where(Playlist.id == playlist_id, Playlist.owner_id == user_id)
        result = await session.execute(stmt)
        result = result.unique().scalar_one_or_none()
        return result

    async def get_user_playlist_by_name(self, session: AsyncSession, owner_id: UUID, name: str) -> PlaylistSchema:
        stmt = select(Playlist).where(Playlist.owner_id == owner_id).where(Playlist.name == name)
        result = await session.execute(stmt)
        result = result.unique().scalar_one_or_none()
        if not result:
            raise NotFoundException(f"User({owner_id}) playlist with name: {name}, not found")
        return PlaylistSchema.model_validate(result)

    async def get_active_streamer_playlist(self, session: AsyncSession, owner_id: UUID) -> PlaylistSchema:
        stmt = select(Playlist).where(Playlist.owner_id == owner_id).where(Playlist.is_allow_external_requests)
        result = await session.execute(stmt)
        result = result.scalar_one_or_none()
        if not result:
            raise NotActivePlaylist("Active playlist not found")
        return PlaylistSchema.model_validate(result)

    async def get_by_string(self, session: AsyncSession, query: str) -> list[PlaylistSchema]:
        superstring_condition = or_(
            literal(query).ilike(func.concat("%", Playlist.name, "%")),
            literal(query).ilike(func.concat("%", Playlist.owner_nickname, "%")),
            literal(query).ilike(func.concat("%", Playlist.description, "%")),
        )
        search_pattern = f"%{query}%"
        search_condition = or_(
            Playlist.name.ilike(search_pattern),
            Playlist.owner_nickname.ilike(search_pattern),
            Playlist.description.ilike(search_pattern),
        )
        combined_condition = or_(search_condition, superstring_condition)
        stmt = select(Playlist).where(combined_condition)

        result = await session.execute(stmt)
        result = result.scalars().unique().all()

        return [PlaylistSchema.model_validate(item) for item in result]

    async def get_user_playlists_by_sourse(
        self, session: AsyncSession, owner_id: UUID, platform_user_id: str, source: TrackSource
    ) -> list[PlaylistSchema]:

        target_source = {"platform": source.value, "platform_user_id": platform_user_id}
        stmt = (
            select(Playlist)
            .where(Playlist.owner_id == owner_id)
            .where(Playlist.allow_sources.contains([target_source]))
        )

        result = await session.execute(stmt)
        items = result.unique().scalars().all()

        return [PlaylistSchema.model_validate(item) for item in items]

    async def create_with_settings(self, session: AsyncSession, data: PlaylistCreate) -> PlaylistSchema:
        try:
            new_playlist = Playlist(**data.model_dump())
            session.add(new_playlist)
            await session.flush()

            general_content_settings = ContentSettingsCreate(
                playlist_id=new_playlist.id,
                platform=ContentSettingScope.GENERAL,
                min_views=10_000,
                min_likes=500,
                max_duration=600,
                track_cooldown=0,
                user_cooldown=2,
            )
            general_donation_rule = DonationRulesCreate(
                playlist_id=new_playlist.id,
                platform=DonationRuleScope.GENERAL,
                name="General",
                currency="USD",
                amount=5.0,
                priority=0,
            )
            session.add_all(
                [
                    DonationRules(**general_donation_rule.model_dump()),
                    ContentSettings(**general_content_settings.model_dump()),
                ]
            )

            await session.commit()
            await session.refresh(new_playlist)

            return self.domain_model.model_validate(new_playlist)
        except IntegrityError as e:
            await session.rollback()
            raise IntegrityConflictException(
                f"{self.sqla_model.__tablename__} conflicts with existing data: {e}",
            ) from e
        except Exception as e:
            await session.rollback()
            raise RepositoryException(f"Unexpected error in model {self.sqla_model.__tablename__}: {e}") from e

    async def add_order_to_playlist(self, session: AsyncSession, playlist_id: UUID, order: OrderCreate) -> OrderDomain:
        try:
            plst = (
                (await session.execute(select(Playlist).where(Playlist.id == playlist_id)))
                .unique()
                .scalar_one_or_none()
            )
            if not plst:
                raise NotFoundException()

            orm_order = Order(**order.model_dump())

            plst.order_links.append(orm_order)
            await session.commit()
            await session.refresh(orm_order)
            return OrderDomain.model_validate(orm_order)
        except IntegrityError as e:
            await session.rollback()
            raise IntegrityConflictException(
                f"{self.sqla_model.__tablename__} conflicts with existing data: {e}",
            ) from e
        except Exception as e:
            await session.rollback()
            raise RepositoryException(f"Unexpected error in model {self.sqla_model.__tablename__}: {e}") from e

    async def remove_order_from_playlist(
        self, session: AsyncSession, playlist_id: UUID, order_id: UUID, reason: DeleteStatus
    ):
        try:
            orm_order = (
                (
                    await session.execute(
                        select(OrderPlaylistStatus).where(
                            OrderPlaylistStatus.order_id == order_id,
                            OrderPlaylistStatus.playlist_id == playlist_id,
                        )
                    )
                )
                .unique()
                .scalar_one_or_none()
            )

            if not orm_order:
                raise NotFoundException()

            orm_order.status = reason
            await session.commit()
            return
        except IntegrityError as e:
            await session.rollback()
            raise IntegrityConflictException(
                f"{self.sqla_model.__tablename__} conflicts with existing data: {e}",
            ) from e
        except Exception as e:
            await session.rollback()
            raise RepositoryException(f"Unexpected error in model {self.sqla_model.__tablename__}: {e}") from e

    async def patch(
        self,
        session: AsyncSession,
        data: PlaylistPatch,
        id_: IdValue,
        column: str = "id",
    ) -> PlaylistSchema:
        """Patch entity by id and return the updated model"""
        try:
            await self.get_one(session, id_, column)

            q = (
                update(self.sqla_model)
                .where(getattr(self.sqla_model, column) == id_)
                .values(**self.to_inner(data))
                .returning(self.sqla_model)
            )

            result = await session.execute(q)
            updated_entity = result.unique().scalar_one()
            await session.commit()
            await session.refresh(updated_entity)
            return self.to_repr(updated_entity)

        except IntegrityError as e:
            await session.rollback()
            raise IntegrityConflictException(
                f"{self.sqla_model.__tablename__} {column}={id_} conflict with existing data: {e}",
            ) from e
        except Exception as e:
            await session.rollback()
            if not isinstance(e, RepositoryException):
                raise RepositoryException(f"Failed to update {self.sqla_model.__tablename__}: {e}") from e
            raise


playlist_repository = PlaylistRepository()
