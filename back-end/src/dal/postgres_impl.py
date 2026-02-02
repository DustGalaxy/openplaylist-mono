from uuid import UUID

from simple_repository import crud_factory
from simple_repository.abctract import IdValue
from simple_repository.exceptions import IntegrityConflictException, RepositoryException, NotFoundException

from sqlalchemy import or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from models.playlist import PlaylistDomain, PlaylistCreate, PlaylistPatch
from orm.playlist import OrderPlaylistStatus, Playlist, Order

from models.settings import PlaylistSettingsDomain, PlaylistSettingsPatch, PlaylistSettingsCreate
from orm.settings import PlaylistSettings

from models.auth_user import AuthUserDomain, AuthUserCreate, AuthUserUpdate
from orm.auth_user import User

from models.linked_accounts import LinkedAccountsDomain, LinkedAccountsCreate, LinkedAccountsUpdate
from orm.linked_accounts import LinkedAccounts

from dal.abstract import IPlaylistRepository, IPlaylistSettingsRepository
from exceptions import NotActivePlaylist

from models.order import OrderCreate, OrderDomain

from _types import Platform, DeleteStatus


class PlaylistRepository(
    crud_factory(Playlist, PlaylistDomain, PlaylistCreate, PlaylistPatch, strict_attrs=False),
    IPlaylistRepository,
):
    async def get_user_playlists_by_sourse(
        self, session: AsyncSession, owner_id: UUID, source: str
    ) -> list[PlaylistDomain]:
        stmt = (
            select(Playlist)
            .join(Playlist.settings)
            .where(
                Playlist.owner_id == owner_id,
                Playlist.settings.has(
                    PlaylistSettings.allow_sources.contains([source]),
                ),
            )
        )
        result = await session.execute(stmt)
        results = result.unique().scalars().all()
        return [PlaylistDomain.model_validate(res) for res in results]

    async def get_user_playlist_by_name(self, session: AsyncSession, owner_id: UUID, name: str) -> PlaylistDomain:
        stmt = select(Playlist).where(Playlist.owner_id == owner_id).where(Playlist.name == name)
        result = await session.execute(stmt)
        result = result.unique().scalar_one_or_none()
        if not result:
            raise NotFoundException(f"User({owner_id}) playlist with name: {name}, not found")
        return PlaylistDomain.model_validate(result)

    async def get_active_streamer_playlist(self, session: AsyncSession, owner_id: UUID) -> PlaylistDomain:
        stmt = (
            select(Playlist)
            .where(Playlist.owner_id == owner_id)
            .join(PlaylistSettings)
            .where(PlaylistSettings.is_allow_external_requests)
        )
        result = await session.execute(stmt)
        result = result.scalar_one_or_none()
        if not result:
            raise NotActivePlaylist("Active playlist not found")
        return PlaylistDomain.model_validate(result)

    async def create_with_settings(
        self,
        session: AsyncSession,
        playlist_data: PlaylistCreate,
    ) -> PlaylistDomain:
        """Create a single entity"""
        try:
            db_model = self.sqla_model(**playlist_data.model_dump(exclude_unset=True))
            db_model.settings = PlaylistSettings()
            db_model.track_data = []
            session.add(db_model)

            await session.commit()
            await session.refresh(db_model)
            return self.domain_model.model_validate(db_model)
        except IntegrityError as e:
            await session.rollback()
            raise IntegrityConflictException(
                f"{self.sqla_model.__tablename__} conflicts with existing data: {e}",
            ) from e
        except Exception as e:
            await session.rollback()
            raise RepositoryException(f"Failed to create {self.sqla_model.__tablename__}: {e}") from e

    async def get_by_string(self, session: AsyncSession, query: str) -> list[PlaylistDomain]:
        superstring_condition = or_(
            text(f"'{query}' ILIKE ('%' || playlists.name || '%')"),
            text(f"'{query}' ILIKE ('%' || playlists.owner_nickname || '%')"),
            text(f"'{query}' ILIKE ('%' || playlists.description || '%')"),
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
        result = result.scalars().all()

        return [PlaylistDomain.model_validate(item) for item in result]

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
        self, session: AsyncSession, playlist_id: UUID, order_id: UUID, user_id: UUID, reason: DeleteStatus
    ):
        try:
            plst = (
                (
                    await session.execute(
                        select(Playlist).where(Playlist.id == playlist_id and Playlist.owner_id == user_id)
                    )
                )
                .unique()
                .scalar_one_or_none()
            )
            if not plst:
                raise NotFoundException()

            orm_order = (
                (
                    await session.execute(
                        select(OrderPlaylistStatus).where(
                            OrderPlaylistStatus.order_id == order_id and OrderPlaylistStatus.playlist_id == playlist_id
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
    ) -> PlaylistDomain:
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


class PlaylistSettingsRepository(
    crud_factory(PlaylistSettings, PlaylistSettingsDomain, PlaylistSettingsCreate, PlaylistSettingsPatch),
    IPlaylistSettingsRepository,
):
    pass


playlist_settings_repository = PlaylistSettingsRepository()


class UserRepository(crud_factory(User, AuthUserDomain, AuthUserCreate, AuthUserUpdate)):
    async def get_user_by_link(
        self, session: AsyncSession, platform: Platform, platform_user_id: str
    ) -> AuthUserDomain:
        stmt = (
            select(User)
            .join(LinkedAccounts)
            .where(LinkedAccounts.platform == platform, LinkedAccounts.platform_user_id == platform_user_id)
        )
        res = await session.execute(stmt)
        user = res.unique().scalars().one_or_none()

        if not user:
            raise NotFoundException(
                f"{self.sqla_model.__tablename__} with platform_user_id={platform_user_id} and platform={platform} not found"
            )

        return AuthUserDomain.model_validate(user)

    async def patch(
        self,
        session: AsyncSession,
        data: AuthUserUpdate,
        id_: IdValue,
        column: str = "id",
    ) -> AuthUserDomain:
        """Patch entity by id and return the updated model"""
        try:
            await self.get_one(session, id_, column)

            q = (
                update(self.sqla_model)
                .where(getattr(self.sqla_model, column) == id_)
                .values(**data.model_dump(exclude_unset=True))
                .returning(self.sqla_model)
            )

            result = await session.execute(q)
            updated_entity = result.unique().scalar_one()
            await session.commit()
            await session.refresh(updated_entity)
            return self.domain_model.model_validate(updated_entity)

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


class LinkedAccountsRepository(
    crud_factory(LinkedAccounts, LinkedAccountsDomain, LinkedAccountsCreate, LinkedAccountsUpdate)
): ...


user_repository = UserRepository()
linked_accounts_repository = LinkedAccountsRepository()
