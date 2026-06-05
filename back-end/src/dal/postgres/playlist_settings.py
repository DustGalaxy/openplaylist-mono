from uuid import UUID

from simple_repository import crud_factory
from simple_repository.exceptions import IntegrityConflictException, RepositoryException, NotFoundException

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from src.orm.playlist import Playlist

from src.models.settings import (
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
from src.orm.settings import Settings, ContentSettings, DonationRules, ChatRules, BlockList


from src.dal.abstract import IPlaylistSettingsRepository


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
