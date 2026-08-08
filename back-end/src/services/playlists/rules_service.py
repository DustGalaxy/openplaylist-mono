from typing import Any, Protocol
from uuid import UUID

from simple_repository.abctract import IAsyncCrud

from src._types import GENERAL_SCOPE, AsyncSession, Platform
from src.dal.postgres.playlist_settings import (
    chat_rules_repository,
    content_settings_repository,
    donation_rules_repository,
    user_black_list_repository,
)
from src.exceptions import NotAuthorizedException
from src.models.playlist import (
    BlockListCreate,
    BlockListPatch,
    BlockListSchema,
    ChatRulesCreate,
    ChatRulesPatch,
    ChatRulesSchema,
    ContentSettingsCreate,
    ContentSettingsPatch,
    ContentSettingsSchema,
    DonationRulesCreate,
    DonationRulesPatch,
    DonationRulesSchema,
    SubSchema,
)
from src.utils import find


class Strategy(Protocol):
    def get_repo(self) -> IAsyncCrud:
        raise NotImplementedError


class StrategyManager:
    def __init__(self):
        self._registry = {}

    def register(self, marks: tuple):
        def wrapper(strategy_class):
            instance = strategy_class()
            for m in marks:
                self._registry[m] = instance
            return strategy_class

        return wrapper

    def get_strategy(self, obj) -> Strategy:
        if isinstance(obj, str):
            strategy = self._registry.get(obj)
        else:
            strategy = self._registry.get(type(obj))
        if strategy is None:
            raise NotImplementedError(f"Strategy for {type(obj) if not isinstance(obj, str) else obj} is not implemented")
        return strategy


manager = StrategyManager()


@manager.register((DonationRulesPatch, DonationRulesCreate, DonationRulesSchema, "donation"))
class DonationRulesStrategy(Strategy):
    def get_repo(self):
        return donation_rules_repository


@manager.register((ContentSettingsPatch, ContentSettingsCreate, ContentSettingsSchema, "content"))
class ContentSettingsStrategy(Strategy):
    def get_repo(self):
        return content_settings_repository


@manager.register((ChatRulesPatch, ChatRulesCreate, ChatRulesSchema, "chat"))
class ChatRulesStrategy(Strategy):
    def get_repo(self):
        return chat_rules_repository


@manager.register((BlockListPatch, BlockListCreate, BlockListSchema, "blocklist"))
class BlockListStrategy(Strategy):
    def get_repo(self):
        return user_black_list_repository


class RulesService:
    def get_repository(self, obj):
        return manager.get_strategy(obj).get_repo()

    async def patch_sub_item(
        self,
        session: AsyncSession,
        data: DonationRulesPatch | ContentSettingsPatch | ChatRulesPatch | BlockListPatch,
        id: UUID,
        playlist_id: UUID,
    ):
        if not await self.sub_item_access(session, playlist_id, id, data):
            raise NotAuthorizedException()

        return await self.get_repository(data).patch(session, data, id)

    async def create_sub_item(
        self,
        session: AsyncSession,
        data: DonationRulesCreate | ContentSettingsCreate | ChatRulesCreate | BlockListCreate,
    ):
        return await self.get_repository(data).create(session, data)

    async def delete_sub_item(
        self,
        session: AsyncSession,
        id: UUID,
        playlist_id: UUID,
        mark: str,
    ):
        if not await self.sub_item_access(session, playlist_id, id, mark):
            raise NotAuthorizedException()

        return await self.get_repository(mark).remove(session, id)

    async def sub_item_access(self, session: AsyncSession, playlist_id: UUID, item_id: UUID, obj: Any) -> bool:
        item: SubSchema = await manager.get_strategy(obj).get_repo().get_one(session, item_id)

        return item.playlist_id == playlist_id

    async def reorder_chat_rules(
        self,
        session: AsyncSession,
        id_list: list[UUID],
        playlist_id: UUID,
    ):
        return await chat_rules_repository.reorder(session, id_list, playlist_id)

    def extract_sub_setting(self, rules_list: list, platform: Platform, is_vip: bool):
        result = None

        if len(rules_list) > 1:
            result = find(rules_list, lambda x: x.platform == (platform if is_vip else GENERAL_SCOPE)) or find(
                rules_list, lambda x: x.platform is GENERAL_SCOPE
            )
        else:
            result = rules_list[0]

        return result


_rules_service = RulesService()


def get_rules_service():
    return _rules_service
