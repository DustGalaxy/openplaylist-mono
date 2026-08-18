from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CreateChannelModeratorTokenRequest(BaseModel):
    name: str = Field("Moderator Link", max_length=100)
    can_control_player: bool = True
    can_manage_all_playlists: bool = False
    expires_at: datetime | None = None


class DirectAddChannelModeratorRequest(BaseModel):
    target_user_id: UUID
    name: str = Field("Moderator", max_length=100)
    can_control_player: bool = True
    can_manage_all_playlists: bool = False
    expires_at: datetime | None = None


class UpdateChannelModeratorRequest(BaseModel):
    name: str | None = Field(None, max_length=100)
    can_control_player: bool | None = None
    can_manage_all_playlists: bool | None = None
    expires_at: datetime | None = None
    is_active: bool | None = None


class GrantPlaylistAccessRequest(BaseModel):
    playlist_id: UUID
    can_manage_tracks: bool = True
    can_manage_settings: bool = False


class UpdatePlaylistAccessRequest(BaseModel):
    can_manage_tracks: bool | None = None
    can_manage_settings: bool | None = None


class PlaylistAccessResponse(BaseModel):
    id: UUID
    playlist_id: UUID
    playlist_name: str | None = None
    can_manage_tracks: bool = True
    can_manage_settings: bool = False

    model_config = ConfigDict(from_attributes=True)


class ChannelModeratorResponse(BaseModel):
    id: UUID
    owner_id: UUID
    user_id: UUID | None = None
    name: str
    user_name: str | None = None
    token: str
    can_control_player: bool = True
    can_manage_all_playlists: bool = False
    expires_at: datetime | None = None
    is_active: bool = True
    playlist_access: list[PlaylistAccessResponse] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChannelModeratorPublicResponse(BaseModel):
    id: UUID
    owner_id: UUID
    user_id: UUID | None = None
    name: str
    user_name: str | None = None
    can_control_player: bool = True
    can_manage_all_playlists: bool = False
    expires_at: datetime | None = None
    is_active: bool = True
    playlist_access: list[PlaylistAccessResponse] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModeratedChannelResponse(BaseModel):
    moderator_id: UUID
    owner_id: UUID
    owner_name: str
    can_control_player: bool = True
    can_manage_all_playlists: bool = False
    playlist_access: list[PlaylistAccessResponse] = Field(default_factory=list)
    expires_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ModeratorChannelAccessInfo(BaseModel):
    owner_id: UUID
    user_id: UUID | None = None
    access_level: str  # "owner" | "moderator" | "none"
    name: str
    can_control_player: bool = True
    can_manage_all_playlists: bool = False

    model_config = ConfigDict(from_attributes=True)


class ModeratorPlaylistAccessInfo(BaseModel):
    playlist_id: UUID
    user_id: UUID | None = None
    access_level: str  # "owner" | "moderator" | "none"
    name: str
    can_manage_tracks: bool = True
    can_manage_settings: bool = False

    model_config = ConfigDict(from_attributes=True)
