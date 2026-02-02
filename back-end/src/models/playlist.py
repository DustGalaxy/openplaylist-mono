from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from utils import find
from .settings import PlaylistSettingsDomain
from .order import DAExtraData, OrderCreate, OrderDomain


class PlaylistDomain(BaseModel):
    id: UUID

    owner_id: UUID
    owner_nickname: str
    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)
    track_data: list[OrderDomain] = Field(default_factory=list)
    active_tracks: list[OrderDomain] = Field(default_factory=list)
    now_playing: str | None = Field(None)
    settings: PlaylistSettingsDomain = Field(
        description="Additional settings for the playlist",
    )

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    # def remove_track(self, track_id: str):
    #     self.track_data = list(filter(lambda x: x.id != track_id, self.track_data))

    # def add_track(self, track_data: OrderCreated) -> dict | list[str]:
    #     if len(err := self.track_validation(track_data)) != 0:
    #         return err

    #     new_track = {
    #         "id": str(uuid7()),
    #         "playlist_id": str(self.id),
    #         "priority": track_data.priority,
    #         "yt_video_id": track_data.yt_video_id,
    #         "title": track_data.title,
    #         "duration": track_data.duration,
    #         "requester_nickname": track_data.requester_nickname,
    #         "created_at": str(track_data.created_at),
    #         "source": track_data.source,
    #     }
    #     self.track_data.append(new_track)
    #     return new_track

    def set_play_now(self, track_id: str):
        self.now_playing = track_id

    def track_validation(self, track_data: OrderCreate) -> list:
        if track_data.from_owner:
            return []

        rules = [
            (lambda: not self.settings.is_allow_external_requests, "External requests are disabled"),
            (
                lambda: isinstance(track_data.extra_data, DAExtraData)
                and self.settings.donation_currency_amount != track_data.extra_data.donation_currency_amount,
                "Wrong currency amount",
            ),
            (lambda: track_data.requester_nickname in self.settings.user_black_list, "Blacklisted user"),
            (lambda: track_data.yt_video_id in self.settings.track_black_list, "Blacklisted track"),
            (lambda: track_data.views < self.settings.min_views, "Not enough views"),
            (lambda: track_data.likes < self.settings.min_likes, "Not enough likes"),
            (lambda: self.settings.max_duration < track_data.duration, "Too long"),
            (
                lambda: self.settings.max_playlist_size > 0 and self.settings.max_playlist_size <= len(self.track_data),
                "Playlist is full",
            ),
            (lambda: self.settings.track_cooldown > 0 and self._check_track_cooldown(track_data), "Track cooldown"),
            (lambda: self.settings.user_cooldown > 0 and self._check_user_cooldown(track_data), "User cooldown"),
        ]

        errors = [error_msg for condition, error_msg in rules if condition()]
        return errors

    def _check_track_cooldown(self, track_data):
        """if track on cooldown return true else false"""
        prevtrack = find(self.track_data, lambda x: x.yt_video_id == track_data.yt_video_id)
        if prevtrack is not None:
            created_at: datetime = prevtrack.created_at
            time_delta = datetime.now().timestamp() - created_at.timestamp()
            if time_delta < (self.settings.track_cooldown * 60):
                return True
        return False

    def _check_user_cooldown(self, track_data):
        """if user on cooldown return true else false"""
        prevtrack = find(self.track_data, lambda x: x.requester_nickname == track_data.requester_nickname)
        if prevtrack is not None:
            created_at: datetime = (
                prevtrack.created_at
                if isinstance(prevtrack.created_at, datetime)
                else datetime.fromisoformat(prevtrack.created_at)
            )
            time_delta = datetime.now().timestamp() - created_at.timestamp()
            if time_delta < (self.settings.user_cooldown * 60):
                return True
        return False


class PlaylistPatch(BaseModel):
    name: str | None = None
    description: str | None = None
    track_data: list[OrderDomain] | None = None
    now_playing: str | None = None


class PlaylistCreate(BaseModel):
    owner_id: UUID
    owner_nickname: str
    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)
