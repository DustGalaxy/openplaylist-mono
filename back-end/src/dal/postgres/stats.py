from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.selectable import Select

from src.models.stats import (
    GlobalStatsResponse,
    IncomingStatsResponse,
    OutgoingStatsResponse,
    PlatformBreakdown,
    StatusBreakdown,
    TopEntityItem,
    TopTrackItem,
)
from src.orm.auth_user import User
from src.orm.playlist import Order, OrderPlaylistStatus, Playlist


def _to_str(value: Any) -> str:
    """Helper to convert enums or raw values to clean strings."""
    if hasattr(value, "value"):
        return str(value.value)
    return str(value)


def _apply_date_filter(stmt: Select, start_date: datetime | None, date_col=Order.created_at) -> Select:
    """Applies created_at filter if start_date is specified."""
    if start_date:
        return stmt.where(date_col >= start_date)
    return stmt


class StatsRepository:
    """Repository executing aggregated analytical queries for statistics."""

    async def _fetch_top_tracks(
        self, session: AsyncSession, where_clause: Any | None = None, start_date: datetime | None = None, limit: int = 10
    ) -> list[TopTrackItem]:
        stmt = (
            select(
                Order.yt_video_id,
                Order.title,
                func.count(Order.id).label("cnt"),
                func.coalesce(func.sum(Order.duration), 0).label("dur"),
            )
            .group_by(Order.yt_video_id, Order.title)
            .order_by(text("cnt DESC"))
            .limit(limit)
        )
        if where_clause is not None:
            stmt = stmt.where(where_clause)
        stmt = _apply_date_filter(stmt, start_date)

        res = await session.execute(stmt)
        return [TopTrackItem(yt_video_id=row[0], title=row[1], count=row[2], total_duration=row[3]) for row in res.all()]

    async def _fetch_platform_breakdown(
        self, session: AsyncSession, where_clause: Any | None = None, start_date: datetime | None = None
    ) -> list[PlatformBreakdown]:
        stmt = select(Order.source, func.count(Order.id)).group_by(Order.source)
        if where_clause is not None:
            stmt = stmt.where(where_clause)
        stmt = _apply_date_filter(stmt, start_date)

        res = await session.execute(stmt)
        return [PlatformBreakdown(platform=_to_str(row[0]), count=row[1]) for row in res.all()]

    async def get_outgoing_stats(
        self, session: AsyncSession, user_id: UUID | str, start_date: datetime | None = None
    ) -> OutgoingStatsResponse:
        user_id_str = str(user_id)
        where_clause = Order.requester_id == user_id_str

        # 1. Total count & total duration
        stmt_totals = _apply_date_filter(
            select(
                func.count(Order.id),
                func.coalesce(func.sum(Order.duration), 0),
            ).where(where_clause),
            start_date,
        )
        res_totals = await session.execute(stmt_totals)
        total_orders, total_duration = res_totals.one()

        if not total_orders:
            return OutgoingStatsResponse()

        # 2. Top tracks & Platform breakdown via reusable helpers
        top_tracks = await self._fetch_top_tracks(session, where_clause, start_date)
        platform_breakdown = await self._fetch_platform_breakdown(session, where_clause, start_date)

        # 3. Top streamers / owners
        stmt_streamers = _apply_date_filter(
            select(Order.owner_id, User.username, func.count(Order.id).label("cnt"))
            .where(where_clause)
            .join(User, User.id == Order.owner_id)
            .group_by(Order.owner_id, User.username)
            .order_by(text("cnt DESC"))
            .limit(10),
            start_date,
        )
        res_streamers = await session.execute(stmt_streamers)
        top_streamers = [TopEntityItem(entity_id=str(row[0]), name=str(row[1]), count=row[2]) for row in res_streamers.all()]

        # 4. Status breakdown
        stmt_status = _apply_date_filter(
            select(OrderPlaylistStatus.status, func.count(OrderPlaylistStatus.order_id))
            .join(Order, OrderPlaylistStatus.order_id == Order.id)
            .where(where_clause)
            .group_by(OrderPlaylistStatus.status),
            start_date,
        )
        res_status = await session.execute(stmt_status)
        status_breakdown = [StatusBreakdown(status=_to_str(row[0]), count=row[1]) for row in res_status.all()]

        return OutgoingStatsResponse(
            total_orders=total_orders,
            total_duration_seconds=total_duration,
            top_tracks=top_tracks,
            top_streamers=top_streamers,
            platform_breakdown=platform_breakdown,
            status_breakdown=status_breakdown,
        )

    async def get_incoming_stats(
        self, session: AsyncSession, owner_id: UUID, start_date: datetime | None = None
    ) -> IncomingStatsResponse:
        where_clause = Order.owner_id == owner_id

        # 1. Total count & total duration
        stmt_totals = _apply_date_filter(
            select(
                func.count(Order.id),
                func.coalesce(func.sum(Order.duration), 0),
            ).where(where_clause),
            start_date,
        )
        res_totals = await session.execute(stmt_totals)
        total_orders, total_duration = res_totals.one()

        if not total_orders:
            return IncomingStatsResponse()

        # 2. Top tracks & Platform breakdown via reusable helpers
        top_tracks = await self._fetch_top_tracks(session, where_clause, start_date)
        platform_breakdown = await self._fetch_platform_breakdown(session, where_clause, start_date)

        # 3. Owner vs Viewer ratio
        stmt_owner = _apply_date_filter(
            select(Order.from_owner, func.count(Order.id)).where(where_clause).group_by(Order.from_owner),
            start_date,
        )
        res_owner = await session.execute(stmt_owner)
        owner_vs_viewer = {"owner": 0, "viewer": 0}
        for is_owner, count in res_owner.all():
            owner_vs_viewer["owner" if is_owner else "viewer"] = count

        # 4. Top requesters
        stmt_requesters = _apply_date_filter(
            select(
                Order.requester_id,
                Order.requester_nickname,
                func.count(Order.id).label("cnt"),
            )
            .where(where_clause)
            .group_by(Order.requester_id, Order.requester_nickname)
            .order_by(text("cnt DESC"))
            .limit(10),
            start_date,
        )
        res_requesters = await session.execute(stmt_requesters)
        top_requesters = [TopEntityItem(entity_id=str(row[0]), name=str(row[1]), count=row[2]) for row in res_requesters.all()]

        return IncomingStatsResponse(
            total_orders=total_orders,
            total_duration_seconds=total_duration,
            top_tracks=top_tracks,
            owner_vs_viewer=owner_vs_viewer,
            top_requesters=top_requesters,
            platform_breakdown=platform_breakdown,
            auto_blocked_count=0,
            donation_summary=None,
        )

    async def get_global_stats(self, session: AsyncSession, start_date: datetime | None = None) -> GlobalStatsResponse:
        # 1. Total count & duration
        stmt_totals = _apply_date_filter(
            select(
                func.count(Order.id),
                func.coalesce(func.sum(Order.duration), 0),
            ),
            start_date,
        )
        res_totals = await session.execute(stmt_totals)
        total_orders, total_duration = res_totals.one()

        if not total_orders:
            return GlobalStatsResponse()

        # 2. Top tracks & Platform breakdown globally via reusable helpers
        top_tracks = await self._fetch_top_tracks(session, None, start_date)
        platform_breakdown = await self._fetch_platform_breakdown(session, None, start_date)

        # 3. Playlist mode breakdown
        stmt_mode = select(Playlist.mode, func.count(Playlist.id)).group_by(Playlist.mode)
        res_mode = await session.execute(stmt_mode)
        mode_breakdown = [PlatformBreakdown(platform=_to_str(row[0]), count=row[1]) for row in res_mode.all()]

        return GlobalStatsResponse(
            total_orders=total_orders,
            total_duration_seconds=total_duration,
            top_tracks=top_tracks,
            platform_breakdown=platform_breakdown,
            mode_breakdown=mode_breakdown,
        )


stats_repository = StatsRepository()
