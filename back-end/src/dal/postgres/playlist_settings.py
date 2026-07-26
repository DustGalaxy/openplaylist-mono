from uuid import UUID

from simple_repository import crud_factory
from simple_repository.exceptions import IntegrityConflictException, RepositoryException

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError


from src.models.playlist import (
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
from src.orm.playlist import ContentSettings, DonationRules, ChatRules, BlockList


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
            stmt = select(ChatRules).where(ChatRules.playlist_id == settings_id, ChatRules.id.in_(id_list))
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
