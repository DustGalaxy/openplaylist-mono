from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ModeratorPlaylistAccessSchema(BaseModel):
    id: UUID
    moderator_id: UUID
    playlist_id: UUID
    can_manage_tracks: bool = True
    can_manage_settings: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChannelModeratorSchema(BaseModel):
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
    playlist_access: list[ModeratorPlaylistAccessSchema] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChannelModeratorPublicSchema(BaseModel):
    id: UUID
    owner_id: UUID
    user_id: UUID | None = None
    name: str
    user_name: str | None = None
    can_control_player: bool = True
    can_manage_all_playlists: bool = False
    expires_at: datetime | None = None
    is_active: bool = True
    playlist_access: list[ModeratorPlaylistAccessSchema] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChannelModeratorCreate(BaseModel):
    owner_id: UUID
    user_id: UUID | None = None
    name: str = Field(..., max_length=100)
    token: str = Field(..., max_length=64)
    can_control_player: bool = True
    can_manage_all_playlists: bool = False
    expires_at: datetime | None = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class ChannelModeratorPatch(BaseModel):
    user_id: UUID | None = None
    name: str | None = None
    can_control_player: bool | None = None
    can_manage_all_playlists: bool | None = None
    expires_at: datetime | None = None
    is_active: bool | None = None

    model_config = ConfigDict(from_attributes=True)


class ModeratorPlaylistAccessCreate(BaseModel):
    moderator_id: UUID
    playlist_id: UUID
    can_manage_tracks: bool = True
    can_manage_settings: bool = False

    model_config = ConfigDict(from_attributes=True)


class ModeratorPlaylistAccessPatch(BaseModel):
    can_manage_tracks: bool | None = None
    can_manage_settings: bool | None = None

    model_config = ConfigDict(from_attributes=True)
