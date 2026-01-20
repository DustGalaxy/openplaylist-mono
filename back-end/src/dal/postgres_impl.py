from uuid import UUID

from simple_repository import crud_factory
from simple_repository.abctract import IdValue
from simple_repository.exceptions import IntegrityConflictException, RepositoryException, NotFoundException

from sqlalchemy import or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from orm.order import Order as OrderORM
from models.order import OrderDomain, OrderPatch, OrderCreate
from dal.abstract import IOrderRepository

from models.playlist import PlaylistDomain, PlaylistCreate, PlaylistPatch
from orm.playlist import Playlist

from models.settings import PlaylistSettingsDomain, PlaylistSettingsPatch, PlaylistSettingsCreate
from orm.settings import PlaylistSettings

from models.auth_user import AuthUserDomain, AuthUserCreate, AuthUserUpdate
from orm.auth_user import User

from models.linked_accounts import LinkedAccountsDomain, LinkedAccountsCreate, LinkedAccountsUpdate
from orm.linked_accounts import LinkedAccounts

from dal.abstract import IPlaylistRepository, IPlaylistSettingsRepository
from exceptions import NotActivePlaylist

from _types import Platform

class PlaylistRepository(
    crud_factory(Playlist, PlaylistDomain, PlaylistCreate, PlaylistPatch),
    IPlaylistRepository,
):
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
            .where(PlaylistSettings.is_active)
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


playlist_repository = PlaylistRepository()


class PlaylistSettingsRepository(
    crud_factory(PlaylistSettings, PlaylistSettingsDomain, PlaylistSettingsCreate, PlaylistSettingsPatch),
    IPlaylistSettingsRepository,
):
    pass


playlist_settings_repository = PlaylistSettingsRepository()


class OrderRepository(IOrderRepository, crud_factory(OrderORM, OrderDomain, OrderCreate, OrderPatch)):
    pass


order_repository = OrderRepository()


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
