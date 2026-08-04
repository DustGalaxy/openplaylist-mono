from datetime import datetime, timezone
import pytest
from src.models.stats import (
    IncomingStatsResponse,
    OutgoingStatsResponse,
    TimeWindow,
    TopEntityItem,
    TopTrackItem,
    UserStatsVisibilitySettings,
)
from src.services.stats_service import StatsService


def test_calculate_start_date():
    service = StatsService()

    date_24h = service.calculate_start_date(TimeWindow.LAST_24H)
    assert date_24h is not None
    assert (datetime.now(timezone.utc) - date_24h).total_seconds() >= 23 * 3600

    date_7d = service.calculate_start_date(TimeWindow.LAST_7D)
    assert date_7d is not None
    assert (datetime.now(timezone.utc) - date_7d).total_seconds() >= 6 * 86400

    date_all = service.calculate_start_date(TimeWindow.ALL_TIME)
    assert date_all is None


def test_filter_public_outgoing_stats():
    service = StatsService()
    raw_stats = OutgoingStatsResponse(
        total_orders=15,
        total_duration_seconds=3600,
        top_tracks=[TopTrackItem(yt_video_id="abc", title="Test Song", count=5)],
        top_streamers=[TopEntityItem(entity_id="st1", name="Streamer 1", count=5)],
    )

    # 1. Default settings (basic metrics public)
    default_settings = UserStatsVisibilitySettings()
    filtered = service.filter_public_outgoing_stats(raw_stats, default_settings)
    assert filtered.total_orders == 15
    assert len(filtered.top_tracks) == 1
    assert len(filtered.top_streamers) == 1

    # 2. Hide top tracks
    hide_tracks_settings = UserStatsVisibilitySettings(show_top_tracks=False)
    filtered_no_tracks = service.filter_public_outgoing_stats(raw_stats, hide_tracks_settings)
    assert filtered_no_tracks.total_orders == 15
    assert len(filtered_no_tracks.top_tracks) == 0

    # 3. Completely hidden outgoing stats
    hide_all_settings = UserStatsVisibilitySettings(show_outgoing_stats=False)
    filtered_hidden = service.filter_public_outgoing_stats(raw_stats, hide_all_settings)
    assert filtered_hidden.total_orders == 0


def test_filter_public_incoming_stats():
    service = StatsService()
    raw_stats = IncomingStatsResponse(
        total_orders=50,
        total_duration_seconds=12000,
        top_tracks=[TopTrackItem(yt_video_id="xyz", title="Stream Hit", count=10)],
        auto_blocked_count=5,
        donation_summary={"USD": 50.0},
    )

    # Default settings (donations and moderation stats hidden by default for privacy)
    default_settings = UserStatsVisibilitySettings()
    filtered = service.filter_public_incoming_stats(raw_stats, default_settings)
    assert filtered.total_orders == 50
    assert filtered.auto_blocked_count == 0
    assert filtered.donation_summary is None

    # Enable donations & moderation stats
    public_donation_settings = UserStatsVisibilitySettings(show_donations=True, show_moderation_stats=True)
    filtered_with_donations = service.filter_public_incoming_stats(raw_stats, public_donation_settings)
    assert filtered_with_donations.auto_blocked_count == 5
    assert filtered_with_donations.donation_summary == {"USD": 50.0}
