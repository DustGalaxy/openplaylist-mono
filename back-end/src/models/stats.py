from enum import Enum
from typing import Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class TimeWindow(str, Enum):
    LAST_24H = "24h"
    LAST_7D = "7d"
    LAST_30D = "30d"
    ALL_TIME = "all_time"


class UserStatsVisibilitySettings(BaseModel):
    show_outgoing_stats: bool = True
    show_incoming_stats: bool = True
    show_top_tracks: bool = True
    show_top_streamers: bool = True
    show_top_requesters: bool = True
    show_donations: bool = False
    show_moderation_stats: bool = False

    model_config = ConfigDict(from_attributes=True)


class TopTrackItem(BaseModel):
    yt_video_id: str
    title: str
    count: int
    total_duration: int = 0


class TopEntityItem(BaseModel):
    entity_id: str
    name: str
    count: int


class StatusBreakdown(BaseModel):
    status: str
    count: int


class PlatformBreakdown(BaseModel):
    platform: str
    count: int


class OutgoingStatsResponse(BaseModel):
    total_orders: int = 0
    total_duration_seconds: int = 0
    top_tracks: list[TopTrackItem] = Field(default_factory=list)
    top_streamers: list[TopEntityItem] = Field(default_factory=list)
    platform_breakdown: list[PlatformBreakdown] = Field(default_factory=list)
    status_breakdown: list[StatusBreakdown] = Field(default_factory=list)


class IncomingStatsResponse(BaseModel):
    total_orders: int = 0
    total_duration_seconds: int = 0
    top_tracks: list[TopTrackItem] = Field(default_factory=list)
    owner_vs_viewer: dict[str, int] = Field(default_factory=lambda: {"owner": 0, "viewer": 0})
    top_requesters: list[TopEntityItem] = Field(default_factory=list)
    platform_breakdown: list[PlatformBreakdown] = Field(default_factory=list)
    auto_blocked_count: int = 0
    donation_summary: dict[str, float] | None = None


class GlobalStatsResponse(BaseModel):
    total_orders: int = 0
    total_duration_seconds: int = 0
    top_tracks: list[TopTrackItem] = Field(default_factory=list)
    platform_breakdown: list[PlatformBreakdown] = Field(default_factory=list)
    mode_breakdown: list[PlatformBreakdown] = Field(default_factory=list)
