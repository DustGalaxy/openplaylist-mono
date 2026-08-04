from uuid import UUID
from fastapi import APIRouter, Query, status

from src.adapters._fastapi.dependencies import DB_SESSION, USER_ID
from src.models.stats import (
    GlobalStatsResponse,
    IncomingStatsResponse,
    OutgoingStatsResponse,
    TimeWindow,
    UserStatsVisibilitySettings,
)
from src.services.stats_service import stats_service

router = APIRouter(prefix="/stats", tags=["Statistics"])


@router.get(
    "/outgoing",
    response_model=OutgoingStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get outgoing order statistics for current user",
)
async def get_my_outgoing_stats(
    session: DB_SESSION,
    user_id: USER_ID,
    period: TimeWindow = Query(default=TimeWindow.ALL_TIME),
):
    """Returns statistics on songs ordered by the current user across external playlists."""
    return await stats_service.get_outgoing_stats(session, user_id, period)


@router.get(
    "/incoming",
    response_model=IncomingStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get incoming order statistics for current user's playlists",
)
async def get_my_incoming_stats(
    session: DB_SESSION,
    user_id: USER_ID,
    period: TimeWindow = Query(default=TimeWindow.ALL_TIME),
):
    """Returns statistics on orders received in the streamer's playlists."""
    return await stats_service.get_incoming_stats(session, user_id, period)


@router.get(
    "/global",
    response_model=GlobalStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get global platform-wide order statistics",
)
async def get_global_stats(
    session: DB_SESSION,
    period: TimeWindow = Query(default=TimeWindow.ALL_TIME),
):
    """Returns platform-wide music ordering statistics."""
    return await stats_service.get_global_stats(session, period)


@router.get(
    "/users/{target_user_id}/public",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Get public statistics for a specified user profile",
)
async def get_public_user_stats(
    session: DB_SESSION,
    target_user_id: UUID,
    period: TimeWindow = Query(default=TimeWindow.ALL_TIME),
):
    """Returns public profile statistics with privacy visibility settings applied."""
    # Fetch default settings (basic metrics enabled by default)
    visibility_settings = UserStatsVisibilitySettings()

    raw_outgoing = await stats_service.get_outgoing_stats(session, target_user_id, period)
    raw_incoming = await stats_service.get_incoming_stats(session, target_user_id, period)

    filtered_outgoing = stats_service.filter_public_outgoing_stats(raw_outgoing, visibility_settings)
    filtered_incoming = stats_service.filter_public_incoming_stats(raw_incoming, visibility_settings)

    return {
        "user_id": target_user_id,
        "period": period,
        "outgoing": filtered_outgoing,
        "incoming": filtered_incoming,
    }
