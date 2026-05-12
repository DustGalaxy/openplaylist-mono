from datetime import datetime
from uuid import UUID

from simple_repository import crud_factory
from simple_repository.abctract import IdValue
from simple_repository.exceptions import IntegrityConflictException, RepositoryException, NotFoundException

from sqlalchemy import func, literal, or_, select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from models.playlist import PlaylistSchema, PlaylistCreate, PlaylistPatch
from orm.playlist import OrderPlaylistStatus, Playlist, Order

from models.settings import (
    SettingsSchema,
    SettingsPatch,
    SettingsCreate,
    ContentSettingsCreate,
    ContentSettingsPatch,
    ContentSettingsSchema,
    DonationRulesPatch,
    DonationRulesCreate,
    DonationRulesSchema,
    ChatRulesCreate,
    ChatRulesPatch,
    ChatRulesSchema,
    BlockListSchema,
    BlockListCreate,
    BlockListPatch,
)
from orm.settings import Settings, ContentSettings, DonationRules, ChatRules, BlockList


from models.auth_user import AuthUserSchema, AuthUserCreate, AuthUserUpdate
from orm.auth_user import User

from models.linked_accounts import LinkedAccountsDomain, LinkedAccountsCreate, LinkedAccountsUpdate
from orm.linked_accounts import LinkedAccounts

from models.order import OrderCreate, OrderDomain

from orm.token_vault import TokenVault
from models.token_vault import TokenVaultCreate, TokenVaultUpdate, TokenVaultDomain

from dal.abstract import IPlaylistRepository, IPlaylistSettingsRepository
from exceptions import NotActivePlaylist


from _types import DB_DonationPlatform, Platform, DeleteStatus, _All_Platforms


class PlaylistRepository(
    crud_factory(Playlist, PlaylistSchema, PlaylistCreate, PlaylistPatch),
    IPlaylistRepository,
):
    def to_repr(self, object: Playlist) -> PlaylistSchema:
        return self.domain_model.model_validate(object)

    def to_inner(self, data: PlaylistCreate | PlaylistSchema | PlaylistPatch) -> dict:
        return data.model_dump(exclude_unset=True)

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
        self, session: AsyncSession, owner_id: UUID, platform_user_id: str, source: Platform
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

            new_settings = Settings(playlist_id=new_playlist.id)
            session.add(new_settings)
            await session.flush()

            general_content_settings = ContentSettingsCreate(
                settings_id=new_settings.id,
                platform=_All_Platforms.GENERAL,
                min_views=10_000,
                min_likes=500,
                max_duration=600,
                track_cooldown=0,
                user_cooldown=2,
            )
            general_donation_rule = DonationRulesCreate(
                settings_id=new_settings.id,
                platform=DB_DonationPlatform.GENERAL,
                name="General",
                slug="general",
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
            await session.refresh(new_settings)
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
        self, session: AsyncSession, playlist_id: UUID, order_id: UUID, user_id: UUID, reason: DeleteStatus
    ):
        try:
            plst = (
                (
                    await session.execute(
                        select(Playlist).where(Playlist.id == playlist_id, Playlist.owner_id == user_id)
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


class ContentSettingsRepository(
    crud_factory(ContentSettings, ContentSettingsSchema, ContentSettingsCreate, ContentSettingsPatch),
):
    def to_inner(self, data: ContentSettingsCreate | ContentSettingsSchema | ContentSettingsPatch) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: ContentSettings) -> ContentSettingsSchema:
        return self.domain_model.model_validate(object)


content_settings_repository = ContentSettingsRepository()


class ChatRulesRepository(
    crud_factory(ChatRules, ChatRulesSchema, ChatRulesCreate, ChatRulesPatch),
):
    def to_inner(self, data: ChatRulesCreate | ChatRulesSchema | ChatRulesPatch) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: ChatRules) -> ChatRulesSchema:
        return self.domain_model.model_validate(object)

    async def reorder(self, session: AsyncSession, id_list: list[UUID], settings_id: UUID):
        try:
            stmt = select(ChatRules).where(ChatRules.settings_id == settings_id, ChatRules.id.in_(id_list))
            result = await session.execute(stmt)
            result = result.unique().scalars().all()

            for i, id in enumerate(id_list):
                for item in result:
                    if item.id == id:
                        item.overrive_order = i
            await session.commit()
            return True
        except IntegrityError as e:
            await session.rollback()
            raise IntegrityConflictException(
                f"{self.sqla_model.__tablename__} conflicts with existing data: {e}",
            )
        except Exception as e:
            await session.rollback()
            raise RepositoryException(f"Unexpected error in model {self.sqla_model.__tablename__}: {e}") from e


chat_rules_repository = ChatRulesRepository()


class DonationRulesRepository(
    crud_factory(DonationRules, DonationRulesSchema, DonationRulesCreate, DonationRulesPatch),
):
    def to_inner(self, data: DonationRulesCreate | DonationRulesSchema | DonationRulesPatch) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: DonationRules) -> DonationRulesSchema:
        return self.domain_model.model_validate(object)


donation_rules_repository = DonationRulesRepository()


class BlockListRepository(
    crud_factory(BlockList, BlockListSchema, BlockListCreate, BlockListPatch),
):
    def to_inner(self, data: BlockListCreate | BlockListSchema | BlockListPatch) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: BlockList) -> BlockListSchema:
        return self.domain_model.model_validate(object)


user_black_list_repository = BlockListRepository()


class PlaylistSettingsRepository(
    crud_factory(Settings, SettingsSchema, SettingsCreate, SettingsPatch),
    IPlaylistSettingsRepository,
):
    def to_inner(self, data: SettingsCreate | SettingsSchema | SettingsPatch) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: Settings) -> SettingsSchema:
        return self.domain_model.model_validate(object)

    async def get_by_plst(self, session: AsyncSession, playlist_id: UUID, user_id: UUID) -> SettingsSchema:
        stmt = (
            select(Settings)
            .join(Playlist, Settings.playlist_id == Playlist.id)
            .where(Settings.playlist_id == playlist_id, Playlist.owner_id == user_id)
        )
        result = await session.execute(stmt)
        result = result.unique().scalar_one_or_none()
        if not result:
            raise NotFoundException()
        return SettingsSchema.model_validate(result)

    async def get_merged(self, session: AsyncSession, settings_id: UUID) -> SettingsSchema:

        stmt = (
            select(Settings)
            .options(
                selectinload(Settings.content_settings),
                selectinload(Settings.donation_rules),
                selectinload(Settings.chat_rules),
                selectinload(Settings.block_list),
            )
            .where(Settings.id == settings_id)
        )

        result = await session.execute(stmt)
        result = result.unique().scalar_one_or_none()
        if not result:
            raise NotFoundException()
        return SettingsSchema.model_validate(result)


playlist_settings_repository = PlaylistSettingsRepository()


class UserRepository(crud_factory(User, AuthUserSchema, AuthUserCreate, AuthUserUpdate)):
    def to_inner(self, data: AuthUserCreate | AuthUserSchema | AuthUserUpdate) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: User) -> AuthUserSchema:
        return self.domain_model.model_validate(object)

    async def get_user_by_link(
        self, session: AsyncSession, platform: Platform, platform_user_id: str
    ) -> AuthUserSchema:
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

        return AuthUserSchema.model_validate(user)

    async def patch(
        self,
        session: AsyncSession,
        data: AuthUserUpdate,
        id_: IdValue,
        column: str = "id",
    ) -> AuthUserSchema:
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
):
    def to_inner(self, data: LinkedAccountsCreate | LinkedAccountsDomain | LinkedAccountsUpdate) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: LinkedAccounts) -> LinkedAccountsDomain:
        return self.domain_model.model_validate(object)


class TokenVaultRepository(crud_factory(TokenVault, TokenVaultDomain, TokenVaultCreate, TokenVaultUpdate)):
    def to_inner(self, data: TokenVaultCreate | TokenVaultDomain | TokenVaultUpdate) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: TokenVault) -> TokenVaultDomain:
        return self.domain_model.model_validate(object)

    async def fetch_tokens_to_refresh(self, session: AsyncSession) -> list[TokenVaultDomain]:
        stmt = select(TokenVault).where(TokenVault.expires_at < int(datetime.now().timestamp()) - 60 * 60 * 2)

        result = await session.execute(stmt)
        result = result.unique().scalars().all()

        return [self.to_repr(item) for item in result]


user_repository = UserRepository()
linked_accounts_repository = LinkedAccountsRepository()
token_vault_repository = TokenVaultRepository()
