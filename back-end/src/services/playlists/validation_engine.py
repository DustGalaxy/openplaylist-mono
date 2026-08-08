from datetime import datetime
from typing import Any

from src.models.order import OrderCreate, OrderDomain
from src.models.playlist import ContentSettingsSchema, DonationRulesSchema, PlaylistSchema
from src._types import ContentSettingScope, DonationRuleScope
from src.utils import find, find_all


class ValidationEngine:
    def __init__(self, owner_is_vip: bool):
        self.owner_is_vip = owner_is_vip

    def get_content_settings(self, content_settings: list[ContentSettingsSchema], platform: ContentSettingScope) -> dict:
        base_obj = next(
            (c for c in content_settings if c.platform == platform),
            find(content_settings, lambda x: x.platform == ContentSettingScope.GENERAL),
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

    def get_donations_settings(self, donation_rules: list[DonationRulesSchema], platform: DonationRuleScope) -> list[dict]:

        base_obj = [c for c in donation_rules if c.platform == platform]
        if not base_obj:
            base_obj = find_all(donation_rules, lambda x: x.platform == DonationRuleScope.GENERAL)

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

    def validate_track(self, new_track: OrderCreate, playlist: PlaylistSchema) -> list:
        if new_track.from_owner:
            return []

        # requester_roles = self.identify_roles(new_track.priority)

        effective_content_settings = self.get_content_settings(playlist.content_settings, new_track.source)  # type: ignore

        effective_donation_settings = self.get_donations_settings(playlist.donation_rules, new_track.source)  # type: ignore

        rules = [
            (
                lambda: (
                    new_track.source in DonationRuleScope
                    and not self.check_donation_rules(
                        effective_donation_settings,
                        "amount",
                        new_track.extra_data.donation_amount,  # type: ignore
                    )
                ),
                "Wrong donation amount",
            ),
            (
                lambda: (
                    new_track.source in DonationRuleScope
                    and not self.check_donation_rules(
                        effective_donation_settings,
                        "currency",
                        new_track.extra_data.donation_currency,  # type: ignore
                    )
                ),
                "Wrong donation currency",
            ),
            (
                lambda: (
                    new_track.requester_nickname
                    in [
                        block.trigger_value
                        for block in playlist.block_list
                        if block.trigger_type == "user_name" and new_track.source == block.platform
                    ]
                    or new_track.requester_id
                    in [
                        block.trigger_value
                        for block in playlist.block_list
                        if block.trigger_type == "user_id" and new_track.source == block.platform
                    ]
                ),
                "Blacklisted user",
            ),
            (lambda: new_track.yt_video_id in playlist.track_black_list, "Blacklisted track"),
            (lambda: new_track.views < effective_content_settings.get("min_views", 0), "Not enough views"),
            (lambda: new_track.likes < effective_content_settings.get("min_likes", 0), "Not enough likes"),
            (lambda: effective_content_settings.get("max_duration", 0) < new_track.duration, "Too long"),
            (
                lambda: playlist.max_playlist_size > 0 and playlist.max_playlist_size <= len(playlist.track_data),
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
