from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from src.dto.settings import ReadPlaylistSettings
from src.models.order import OrderDomain
from src.models.playlist import AllowedSource


class ReadPlaylist(BaseModel):
    id: UUID
    owner_id: UUID
    owner_nickname: str

    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)
    tags: list[str] = Field(default_factory=list)

    is_public: bool
    is_favorite: bool
    is_allow_external_requests: bool
    allow_sources: list[AllowedSource]
    show_in_widget: bool

    now_playing: str | None = Field(None)

    track_data: list[OrderDomain] = Field(default_factory=list)

    settings: ReadPlaylistSettings | None = Field(None)

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReadPlaylistPreview(BaseModel):
    id: UUID = Field(..., description="Unique identifier for the playlist")

    owner_nickname: str = Field(..., description="Nickname of the owner of the playlist")
    name: str = Field(..., max_length=100, description="Name of the playlist")
    description: str | None = Field(None, max_length=500, description="Description of the playlist")

    created_at: datetime = Field(..., description="Creation timestamp of the playlist")
    updated_at: datetime = Field(..., description="Last update timestamp of the playlist")

    model_config = ConfigDict(from_attributes=True)


class PlaylistBaseinfo(BaseModel):
    id: UUID = Field(..., description="Unique identifier for the playlist")
    owner_id: UUID = Field(..., description="ID of the owner of the playlist")

    now_playing: str | None = Field(None, description="Currently playing track ID")
    is_allow_external_requests: bool = Field(..., description="Indicates if the playlist is active")
    is_public: bool = Field(..., description="Indicates if the playlist is public")

    model_config = ConfigDict(from_attributes=True)


class NewPlaylist(BaseModel):
    name: str
    description: str
    show_in_widget: bool



class PlayNow(BaseModel):
    track_id: str | None
    playlist_id: UUID
