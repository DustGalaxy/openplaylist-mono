from datetime import datetime
from typing import Protocol, Any
from uuid import UUID


from dal.abstract import IAsyncCrud, IPlaylistSettingsRepository
from dal.postgres_impl import (
    playlist_settings_repository,
    content_settings_repository,
    donation_rules_repository,
    chat_rules_repository,
    user_black_list_repository,
)
from models.settings import (
    SubSchema,
    SettingsPatch,
    SettingsSchema,
    ContentSettingsCreate,
    ContentSettingsSchema,
    ContentSettingsPatch,
    DonationRulesCreate,
    DonationRulesSchema,
    DonationRulesPatch,
    ChatRulesCreate,
    ChatRulesSchema,
    ChatRulesPatch,
    BlockListSchema,
    BlockListCreate,
    BlockListPatch,
)
from models.order import OrderCreate, DAExtraData
from models.auth_user import AuthUserSchema
from exceptions import NotAuthorizedException
from _types import AsyncSession, Platform
from utils import find


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
            raise NotImplementedError(
                f"Strategy for {type(obj) if not isinstance(obj, str) else obj} is not implemented"
            )
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


class SettingsLowService:
    def __init__(self, _playlist_settings_repository: IPlaylistSettingsRepository):
        self.repository = _playlist_settings_repository

    def get_repository(self, obj):
        return manager.get_strategy(obj).get_repo()

    async def get__(self, session: AsyncSession, settings_id: UUID) -> SettingsSchema:
        basic = await self.repository.get_merged(session, settings_id)
        return basic

    async def get_by_plst(self, session: AsyncSession, playlist_id: UUID, user_id: UUID) -> SettingsSchema:
        return await self.repository.get_by_plst(session, playlist_id, user_id)

    async def patch(
        self,
        session: AsyncSession,
        data: SettingsPatch,
        id: UUID,
    ):
        return await self.repository.patch(session, data, id)

    async def patch_sub_item(
        self,
        session: AsyncSession,
        data: DonationRulesPatch | ContentSettingsPatch | ChatRulesPatch | BlockListPatch,
        id: UUID,
        settings_id: UUID,
    ):
        sub_item_access = await self.sub_item_access(session, settings_id, id, data)
        if not sub_item_access:
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
        settings_id: UUID,
        mark: str,
    ):
        sub_item_access = await self.sub_item_access(session, settings_id, id, mark)
        if not sub_item_access:
            raise NotAuthorizedException()

        return await self.get_repository(mark).remove(session, id)

    async def sub_item_access(self, session: AsyncSession, settings_id: UUID, item_id: UUID, obj: Any) -> bool:
        item: SubSchema = await manager.get_strategy(obj).get_repo().get_one(session, item_id)

        return item.settings_id == settings_id

    async def reorder_chat_rules(
        self,
        session: AsyncSession,
        id_list: list[UUID],
        settings_id: UUID,
    ):
        return await chat_rules_repository.reorder(session, id_list, settings_id)



    def extract_sub_setting(self, setting: list, platform: Platform, is_vip: bool):
        result = None

        if len(setting) > 1:
            result = find(setting, lambda x: x.platform == (platform if is_vip else None)) or find(
                setting, lambda x: x.platform is None
            )
        else:
            result = setting[0]

        return result

    async def validate_track(
        self,
        session: AsyncSession,
        playlist_id: UUID,
        tracks: list,
        track_data: OrderCreate,
        user: AuthUserSchema,
    ):

        settings = await self.repository.get_one(session, playlist_id, "playlist_id")
        is_vip = (user.vip_expires_at and user.vip_expires_at > datetime.now()) or False

        content_settings: ContentSettingsSchema = self.extract_sub_setting(
            settings.content_settings, track_data.source, is_vip
        )  # type: ignore
        payment_settings: DonationRulesSchema = self.extract_sub_setting(
            settings.donation_rules, track_data.source, is_vip
        )  # type: ignore

        def track_validation(track_data: OrderCreate, settings: SettingsSchema) -> list:
            if track_data.from_owner:
                return []

            rules = [
                (
                    lambda: (
                        isinstance(track_data.extra_data, DAExtraData)
                        and payment_settings.amount != track_data.extra_data.donation_currency_amount
                    ),
                    "Wrong currency amount",
                ),
                (
                    lambda: (
                        track_data.requester_nickname
                        in [
                            block.trigger_value
                            for block in settings.block_list
                            if block.trigger_type == "user_name" and track_data.source == block.platform
                        ]
                    ),
                    "Blacklisted user",
                ),
                (lambda: track_data.yt_video_id in settings.track_black_list, "Blacklisted track"),
                (lambda: track_data.views < content_settings.min_views, "Not enough views"),
                (lambda: track_data.likes < content_settings.min_likes, "Not enough likes"),
                (lambda: content_settings.max_duration < track_data.duration, "Too long"),
                (
                    lambda: settings.max_playlist_size > 0 and settings.max_playlist_size <= len(tracks),
                    "Playlist is full",
                ),
                (lambda: content_settings.track_cooldown > 0 and _check_track_cooldown(track_data), "Track cooldown"),
                (lambda: content_settings.user_cooldown > 0 and _check_user_cooldown(track_data), "User cooldown"),
            ]

            errors = [error_msg for condition, error_msg in rules if condition()]
            return errors

        def _check_track_cooldown(track_data):
            """if track on cooldown return true else false"""
            prevtrack = find(tracks, lambda x: x.yt_video_id == track_data.yt_video_id)
            if prevtrack is not None:
                created_at: datetime = prevtrack.created_at
                time_delta = datetime.now().timestamp() - created_at.timestamp()
                if time_delta < (content_settings.track_cooldown * 60):
                    return True
            return False

        def _check_user_cooldown(track_data):
            """if user on cooldown return true else false"""
            prevtrack = find(tracks, lambda x: x.requester_nickname == track_data.requester_nickname)
            if prevtrack is not None:
                created_at: datetime = (
                    prevtrack.created_at
                    if isinstance(prevtrack.created_at, datetime)
                    else datetime.fromisoformat(prevtrack.created_at)
                )
                time_delta = datetime.now().timestamp() - created_at.timestamp()
                if time_delta < (content_settings.user_cooldown * 60):
                    return True
            return False

        return track_validation(track_data, settings)


settings_service = SettingsLowService(playlist_settings_repository)


def get_settings_service():
    return settings_service
