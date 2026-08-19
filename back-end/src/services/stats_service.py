from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.dal._redis.broker import get_broker
from src.dal.postgres.stats import stats_repository
from src.dal.postgres.user import user_repository
from src.models.auth_user import AuthUserUpdate
from src.models.stats import (
    GlobalStatsResponse,
    IncomingStatsResponse,
    OutgoingStatsResponse,
    TimeWindow,
    UserStatsVisibilitySettings,
    UserStatsVisibilitySettingsPatch,
)


class StatsService:
    CACHE_TTL_USER = 900  # 15 minutes
    CACHE_TTL_GLOBAL = 3600  # 1 hour

    def calculate_start_date(self, time_window: TimeWindow) -> datetime | None:
        now = datetime.now()
        if time_window == TimeWindow.LAST_24H:
            return now - timedelta(hours=24)
        elif time_window == TimeWindow.LAST_7D:
            return now - timedelta(days=7)
        elif time_window == TimeWindow.LAST_30D:
            return now - timedelta(days=30)
        elif time_window == TimeWindow.ALL_TIME:
            return None
        return None

    async def get_outgoing_stats(
        self, session: AsyncSession, user_id: UUID | str, time_window: TimeWindow = TimeWindow.ALL_TIME
    ) -> OutgoingStatsResponse:
        cache_key = f"stats:outgoing:{user_id}:{time_window.value}"
        broker = get_broker()

        try:
            cached_data = broker.get(cache_key)
            if cached_data:
                return OutgoingStatsResponse.model_validate_json(cached_data)
        except Exception:
            pass  # Fallback to DB if cache fails

        start_date = self.calculate_start_date(time_window)
        stats = await stats_repository.get_outgoing_stats(session, user_id, start_date)

        try:
            broker.set(cache_key, stats.model_dump_json(), ex=self.CACHE_TTL_USER)
        except Exception:
            pass

        return stats

    async def get_incoming_stats(
        self, session: AsyncSession, owner_id: UUID, time_window: TimeWindow = TimeWindow.ALL_TIME
    ) -> IncomingStatsResponse:
        cache_key = f"stats:incoming:{owner_id}:{time_window.value}"
        broker = get_broker()

        try:
            cached_data = broker.get(cache_key)
            if cached_data:
                return IncomingStatsResponse.model_validate_json(cached_data)
        except Exception:
            pass

        start_date = self.calculate_start_date(time_window)
        stats = await stats_repository.get_incoming_stats(session, owner_id, start_date)

        try:
            broker.set(cache_key, stats.model_dump_json(), ex=self.CACHE_TTL_USER)
        except Exception:
            pass

        return stats

    async def get_global_stats(self, session: AsyncSession, time_window: TimeWindow = TimeWindow.ALL_TIME) -> GlobalStatsResponse:
        cache_key = f"stats:global:{time_window.value}"
        broker = get_broker()

        try:
            cached_data = broker.get(cache_key)
            if cached_data:
                return GlobalStatsResponse.model_validate_json(cached_data)
        except Exception:
            pass

        start_date = self.calculate_start_date(time_window)
        stats = await stats_repository.get_global_stats(session, start_date)

        try:
            broker.set(cache_key, stats.model_dump_json(), ex=self.CACHE_TTL_GLOBAL)
        except Exception:
            pass

        return stats

    async def get_user_visibility_settings(self, session: AsyncSession, user_id: UUID) -> UserStatsVisibilitySettings:
        try:
            user = await user_repository.get_one(session, user_id)
            if user and user.stats_visibility and isinstance(user.stats_visibility, dict):
                return UserStatsVisibilitySettings.model_validate(user.stats_visibility)
        except Exception:
            pass
        return UserStatsVisibilitySettings()

    async def get_public_user_stats(
        self, session: AsyncSession, target_user_id: UUID, time_window: TimeWindow = TimeWindow.ALL_TIME
    ) -> dict:
        visibility_settings = await self.get_user_visibility_settings(session, target_user_id)

        raw_outgoing = await self.get_outgoing_stats(session, target_user_id, time_window)
        raw_incoming = await self.get_incoming_stats(session, target_user_id, time_window)

        filtered_outgoing = self.filter_public_outgoing_stats(raw_outgoing, visibility_settings)
        filtered_incoming = self.filter_public_incoming_stats(raw_incoming, visibility_settings)

        return {
            "user_id": target_user_id,
            "period": time_window,
            "outgoing": filtered_outgoing,
            "incoming": filtered_incoming,
        }

    async def update_user_stats_privacy(
        self, session: AsyncSession, user_id: UUID, settings_patch: UserStatsVisibilitySettingsPatch
    ) -> UserStatsVisibilitySettings:
        current_settings = await self.get_user_visibility_settings(session, user_id)
        current_dict = current_settings.model_dump()
        patch_dict = settings_patch.model_dump(exclude_unset=True)
        merged_dict = {**current_dict, **{k: v for k, v in patch_dict.items() if v is not None}}

        patch_data = AuthUserUpdate(stats_visibility=merged_dict)
        updated_user = await user_repository.patch(session, patch_data, user_id)
        raw_visibility = updated_user.stats_visibility or {}
        return UserStatsVisibilitySettings.model_validate(raw_visibility)

    def filter_public_outgoing_stats(
        self, stats: OutgoingStatsResponse, settings: UserStatsVisibilitySettings
    ) -> OutgoingStatsResponse:
        if not settings.show_outgoing_stats:
            return OutgoingStatsResponse()

        filtered_top_tracks = stats.top_tracks if settings.show_top_tracks else []
        filtered_top_streamers = stats.top_streamers if settings.show_top_streamers else []

        return OutgoingStatsResponse(
            total_orders=stats.total_orders,
            total_duration_seconds=stats.total_duration_seconds,
            top_tracks=filtered_top_tracks,
            top_streamers=filtered_top_streamers,
            platform_breakdown=stats.platform_breakdown,
            status_breakdown=stats.status_breakdown,
        )

    def filter_public_incoming_stats(
        self, stats: IncomingStatsResponse, settings: UserStatsVisibilitySettings
    ) -> IncomingStatsResponse:
        if not settings.show_incoming_stats:
            return IncomingStatsResponse()

        filtered_top_tracks = stats.top_tracks if settings.show_top_tracks else []
        filtered_top_requesters = stats.top_requesters if settings.show_top_requesters else []
        donation_summary = stats.donation_summary if settings.show_donations else None

        return IncomingStatsResponse(
            total_orders=stats.total_orders,
            total_duration_seconds=stats.total_duration_seconds,
            top_tracks=filtered_top_tracks,
            owner_vs_viewer=stats.owner_vs_viewer,
            top_requesters=filtered_top_requesters,
            platform_breakdown=stats.platform_breakdown,
            auto_blocked_count=stats.auto_blocked_count if settings.show_moderation_stats else 0,
            donation_summary=donation_summary,
        )


stats_service = StatsService()
