from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from uuid6 import uuid7

from exceptions import (
    NotEnoughLikes,
    NotEnoughViews,
    NotActivePlaylist,
    BlackListUser,
    BlackListTrack,
    PlaylistIsFullException,
    TooLong,
    TrackCooldownException,
    UserCooldownException,
    WrongCurrencyAmount,
)

from dto.events import OrderCreated
from utils import find

from .settings import PlaylistSettingsDomain


class PlaylistDomain(BaseModel):
    id: UUID

    owner_id: UUID
    owner_nickname: str
    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)
    track_data: list[dict] = Field(default_factory=list)
    now_playing: str | None = Field(None)
    settings: PlaylistSettingsDomain = Field(
        description="Additional settings for the playlist",
    )

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    def remove_track(self, track_id: str):
        self.track_data = list(filter(lambda x: x.get("id") != track_id, self.track_data))

    def add_track(self, track_data: OrderCreated) -> dict:
        if track_data.is_owner:
            pass
        elif not self.settings.is_allow_external_requests:
            raise NotActivePlaylist()
        elif (
            track_data.source == "da" and self.settings.donation_currency_amount != track_data.donation_currency_amount
        ):
            raise WrongCurrencyAmount()
        elif track_data.requester_nickname in self.settings.user_black_list:
            raise BlackListUser()
        elif track_data.yt_video_id in self.settings.track_black_list:
            raise BlackListTrack()
        elif not track_data.views >= self.settings.min_views:
            raise NotEnoughViews()
        elif not track_data.likes >= self.settings.min_likes:
            raise NotEnoughLikes()
        elif self.settings.max_duration < track_data.duration:
            raise TooLong()
        elif self.settings.max_playlist_size > 0 and self.settings.max_playlist_size <= len(self.track_data):
            raise PlaylistIsFullException()
        elif self.settings.track_cooldown > 0:
            prevtrack = find(self.track_data, lambda x: x.get("yt_video_id") == track_data.yt_video_id)
            if prevtrack is not None:
                created_at: datetime = prevtrack["created_at"]
                time_delta = datetime.now().timestamp() - created_at.timestamp()
                if time_delta < (self.settings.track_cooldown * 60):
                    raise TrackCooldownException()

        elif self.settings.user_cooldown > 0:
            prevtrack = find(self.track_data, lambda x: x.get("requester_nickname") == track_data.requester_nickname)
            if prevtrack is not None:
                created_at: datetime = (
                    prevtrack["created_at"]
                    if isinstance(prevtrack["created_at"], datetime)
                    else datetime.fromisoformat(prevtrack["created_at"])
                )
                time_delta = datetime.now().timestamp() - created_at.timestamp()
                if time_delta < (self.settings.user_cooldown * 60):
                    raise UserCooldownException()

        new_track = {
            "id": str(uuid7()),
            "playlist_id": str(self.id),
            "priority": track_data.priority,
            "yt_video_id": track_data.yt_video_id,
            "title": track_data.title,
            "duration": track_data.duration,
            "requester_nickname": track_data.requester_nickname,
            "created_at": str(track_data.created_at),
            "source": track_data.source,
        }
        self.track_data.append(new_track)
        return new_track

    def set_play_now(self, track_id: str):
        self.now_playing = track_id


class PlaylistPatch(BaseModel):
    name: str | None = None
    description: str | None = None
    track_data: list[dict] | None = None
    now_playing: str | None = None


class PlaylistCreate(BaseModel):
    owner_id: UUID
    owner_nickname: str
    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)
