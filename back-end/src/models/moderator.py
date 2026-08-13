from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ModeratorPermissions(BaseModel):
    can_manage_queue: bool = True
    can_manage_playback: bool = True
    can_manage_settings: bool = False


class PlaylistModeratorSchema(BaseModel):
    id: UUID
    playlist_id: UUID
    user_id: UUID | None = None
    name: str
    user_name: str | None = None
    token: str
    permissions: dict[str, bool] = Field(default_factory=dict)
    expires_at: datetime | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlaylistModeratorPublicSchema(BaseModel):
    id: UUID
    playlist_id: UUID
    user_id: UUID | None = None
    name: str
    user_name: str | None = None
    permissions: dict[str, bool] = Field(default_factory=dict)
    expires_at: datetime | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModeratorCreate(BaseModel):
    playlist_id: UUID
    user_id: UUID | None = None
    name: str = Field(..., max_length=100)
    token: str = Field(..., max_length=64)
    permissions: dict[str, bool] = Field(default_factory=dict)
    expires_at: datetime | None = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class ModeratorPatch(BaseModel):
    user_id: UUID | None = None
    name: str | None = None
    permissions: dict[str, bool] | None = None
    expires_at: datetime | None = None
    is_active: bool | None = None

    model_config = ConfigDict(from_attributes=True)
