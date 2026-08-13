from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.moderator import ModeratorPermissions

if TYPE_CHECKING:
    from src.dto.playlist import ReadPlaylistPreview


class CreateModeratorTokenRequest(BaseModel):
    name: str = Field("Moderator Link", max_length=100)
    permissions: ModeratorPermissions = Field(default_factory=ModeratorPermissions)
    expires_at: datetime | None = None


class DirectAddModeratorRequest(BaseModel):
    target_user_id: UUID
    name: str = Field("Moderator", max_length=100)
    permissions: ModeratorPermissions = Field(default_factory=ModeratorPermissions)
    expires_at: datetime | None = None


class UpdateModeratorRequest(BaseModel):
    name: str | None = Field(None, max_length=100)
    permissions: ModeratorPermissions | None = None
    expires_at: datetime | None = None
    is_active: bool | None = None


class ModeratorItemResponse(BaseModel):
    id: UUID
    playlist_id: UUID
    user_id: UUID | None = None
    name: str
    user_name: str | None = None
    token: str
    permissions: dict[str, bool]
    expires_at: datetime | None = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReadPlaylistModerator(BaseModel):
    id: UUID
    playlist_id: UUID
    user_id: UUID | None = None
    name: str
    user_name: str | None = None
    permissions: dict[str, bool]
    expires_at: datetime | None = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModeratorAccessInfo(BaseModel):
    playlist_id: UUID
    user_id: UUID | None = None
    access_level: str  # "owner" | "moderator" | "none"
    name: str
    permissions: dict[str, bool]

    model_config = ConfigDict(from_attributes=True)


class UserModeratedPlaylistResponse(BaseModel):
    moderator_id: UUID
    playlist: "ReadPlaylistPreview"  # type: ignore
    permissions: dict[str, bool]
    expires_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

