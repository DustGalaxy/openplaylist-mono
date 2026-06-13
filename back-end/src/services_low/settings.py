from datetime import datetime
from typing import Protocol, Any
from uuid import UUID

from src.dal.abstract import IAsyncCrud, IPlaylistSettingsRepository
from src.dal.postgres.playlist_settings import (
    playlist_settings_repository,
    content_settings_repository,
    donation_rules_repository,
    chat_rules_repository,
    user_black_list_repository,
)
from src.models.settings import (
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
from src.models.order import OrderCreate, DAExtraData, OrderDomain
from src.models.playlist import PlaylistSchema
from src.models.auth_user import AuthUserSchema
from src.exceptions import NotAuthorizedException
from src._types import DonationRuleScope, AsyncSession, Platform, ContentSettingScope, GENERAL_SCOPE
from src.utils import find, find_all


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


class ValidationEngine:
    def __init__(self, owner_is_vip: bool):
        self.owner_is_vip = owner_is_vip

    def get_content_settigs(self, settings: SettingsSchema, platform: ContentSettingScope) -> dict:
        base_obj = next(
            (c for c in settings.content_settings if c.platform == platform),
            find(settings.content_settings, lambda x: x.platform == ContentSettingScope.GENERAL),
        )
        if base_obj is None:
            raise ValueError(f"Cannot find base settings for {platform} and Platform.GENERAL settings not found")

        effective = self._to_content_dict(base_obj)

        if not self.owner_is_vip:
            return effective

        # match platform:
        #     case p if p in ChatPlatform:
        #         if user_roles is None:
        #             return effective

        #         chat_rules = sorted(
        #             [r for r in settings.chat_rules if r.platform == platform],
        #             key=lambda x: x.priority,
        #         )
        #         for rule in chat_rules:
        #             if rule.content_settings:
        #                 effective.update(rule.content_settings)

        #     case p if p in DonationPlatform:
        #         donation_rules = find(settings.donation_rules, lambda x: x.platform == platform)
        #         if donation_rules and donation_rules.content_settings:
        #             effective.update(donation_rules.content_settings)

        #     case _:
        #         raise ValueError(f"Unknown platform: {platform}")

        return effective

    def get_donations_settings(self, settings: SettingsSchema, platform: DonationRuleScope) -> list[dict]:

        base_obj = [c for c in settings.donation_rules if c.platform == platform]
        if not base_obj:
            base_obj = find_all(settings.donation_rules, lambda x: x.platform == DonationRuleScope.GENERAL)

        if base_obj is None:
            raise ValueError("Cannot find base settings for platform")

        return [self._to_donation_dict(obj) for obj in base_obj]

    def check_donation_rules(self, rules: list[dict], field_name: str, value: Any) -> bool:
        for rule in rules:
            if rule[field_name] == value:
                return True
        return False

    def identify_roles(self, role_str: str) -> list[str]:
        return role_str.split(":") if role_str else []

    def validate_track(self, new_track: OrderCreate, settings: SettingsSchema, playlist: PlaylistSchema) -> list:
        if new_track.from_owner:
            return []

        # requester_roles = self.identify_roles(new_track.priority)

        effective_content_settings = self.get_content_settigs(settings, new_track.source)  # pyright: ignore[reportArgumentType]

        effective_donation_settings = self.get_donations_settings(settings, new_track.source)  # pyright: ignore[reportArgumentType]

        rules = [
            (
                lambda: (
                    new_track.source in DonationRuleScope
                    and not self.check_donation_rules(
                        effective_donation_settings,
                        "amount",
                        new_track.extra_data.donation_amount,  # pyright: ignore[reportAttributeAccessIssue]
                    )  # type: ignore
                ),
                "Wrong donation amount",
            ),
            (
                lambda: (
                    new_track.source in DonationRuleScope
                    and not self.check_donation_rules(
                        effective_donation_settings,
                        "currency",
                        new_track.extra_data.donation_currency,  # pyright: ignore[reportAttributeAccessIssue]
                    )  # type: ignore
                ),
                "Wrong donation currency",
            ),
            (
                lambda: (
                    new_track.requester_nickname
                    in [
                        block.trigger_value
                        for block in settings.block_list
                        if block.trigger_type == "user_name" and new_track.source == block.platform
                    ]
                    or new_track.requester_id
                    in [
                        block.trigger_value
                        for block in settings.block_list
                        if block.trigger_type == "user_id" and new_track.source == block.platform
                    ]
                ),
                "Blacklisted user",
            ),
            (lambda: new_track.yt_video_id in settings.track_black_list, "Blacklisted track"),
            (lambda: new_track.views < effective_content_settings.get("min_views", 0), "Not enough views"),
            (lambda: new_track.likes < effective_content_settings.get("min_likes", 0), "Not enough likes"),
            (lambda: effective_content_settings.get("max_duration", 0) < new_track.duration, "Too long"),
            (
                lambda: settings.max_playlist_size > 0 and settings.max_playlist_size <= len(playlist.track_data),
                "Playlist is full",
            ),
            (
                lambda: (
                    effective_content_settings.get("track_cooldown", 0) > 0
                    and self._check_track_cooldown(
                        new_track, playlist.track_data, effective_content_settings.get("track_cooldown", 0)
                    )
                ),
                "Track cooldown",
            ),
            (
                lambda: (
                    effective_content_settings.get("user_cooldown", 0) > 0
                    and self._check_user_cooldown(
                        new_track, playlist.track_data, effective_content_settings.get("user_cooldown", 0)
                    )
                ),
                "User cooldown",
            ),
        ]

        return [error for condition, error in rules if condition()]

    def _check_track_cooldown(self, new_track, list_of_tracks, track_cooldown: int):
        """if track on cooldown return true else false"""
        prevtrack = find(list_of_tracks, lambda x: x.yt_video_id == new_track.yt_video_id)
        if prevtrack is not None:
            created_at: datetime = prevtrack.created_at
            time_delta = datetime.now().timestamp() - created_at.timestamp()
            if time_delta < (track_cooldown * 60):
                return True
        return False

    def _check_user_cooldown(self, new_track: OrderCreate, list_of_tracks: list[OrderDomain], user_cooldown: float):
        """if user on cooldown return true else false"""
        prevtrack = find(list_of_tracks, lambda x: x.requester_nickname == new_track.requester_nickname)
        if prevtrack is not None:
            created_at: datetime = (
                prevtrack.created_at
                if isinstance(prevtrack.created_at, datetime)
                else datetime.fromisoformat(prevtrack.created_at)
            )
            time_delta = datetime.now().timestamp() - created_at.timestamp()
            if time_delta < (user_cooldown * 60):
                return True
        return False

    def _to_content_dict(self, obj: ContentSettingsSchema) -> dict:
        return {
            "min_views": obj.min_views,
            "min_likes": obj.min_likes,
            "max_duration": obj.max_duration,
            "track_cooldown": obj.track_cooldown,
            "user_cooldown": obj.user_cooldown,
        }

    def _to_donation_dict(self, obj: DonationRulesSchema) -> dict:
        return {
            "currency": obj.currency,
            "amount": obj.amount,
        }


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
        if not await self.sub_item_access(session, settings_id, id, data):
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
        if not await self.sub_item_access(session, settings_id, id, mark):
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
            result = find(setting, lambda x: x.platform == (platform if is_vip else GENERAL_SCOPE)) or find(
                setting, lambda x: x.platform is GENERAL_SCOPE
            )
        else:
            result = setting[0]

        return result

    async def validate_track(
        self,
        session: AsyncSession,
        playlsit: PlaylistSchema,
        new_track: OrderCreate,
        user: AuthUserSchema,
    ) -> list[str]:

        settings = await self.repository.get_one(session, playlsit.id, "playlist_id")
        is_vip = (user.vip_expires_at and user.vip_expires_at > datetime.now()) or False

        validation_engine = ValidationEngine(owner_is_vip=is_vip)
        return validation_engine.validate_track(new_track, settings, playlsit)


settings_service = SettingsLowService(playlist_settings_repository)


def get_settings_service():
    return settings_service
