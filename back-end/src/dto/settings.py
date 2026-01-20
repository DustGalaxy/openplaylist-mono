from typing import Literal
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

from models.settings import SortSettings


class ReadPlaylistSettings(BaseModel):
    id: UUID
    playlist_id: UUID

    min_views: int = Field(10_000, ge=0, description="Minimum views required for the playlist")
    min_likes: int = Field(500, ge=0, description="Minimum likes required for the playlist")
    max_duration: int = Field(600, ge=0)

    donation_currency_amount: float = Field(50.0, ge=0.0)
    track_cooldown: int = Field(0, ge=0)
    user_cooldown: int = Field(2, ge=0)
    max_playlist_size: int = Field(0, ge=0)

    is_active: bool = Field(default=False, description="Indicates if the settings are active")
    is_public: bool = Field(default=False, description="Indicates if the playlist is public")
    is_favorite: bool = Field(default=False, description="Indicates if the playlist is marked as favorite")

    mode: Literal["flow", "static"]
    repeat_mode: Literal["all", "once", "none"]
    sort_settings: SortSettings

    cost_broacaster: int
    cost_donater: int
    cost_vip: int
    cost_mod: int
    cost_subscriber: int
    cost_turbo: int
    cost_artist: int
    cost_fonder: int
    cost_follower: int

    cost_mode: Literal["add", "max"]

    track_black_list: list[str] = Field(default_factory=list)
    user_black_list: list[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
