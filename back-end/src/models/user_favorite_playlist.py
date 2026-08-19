from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserFavoritePlaylistSchema(BaseModel):
    id: UUID
    user_id: UUID
    playlist_id: UUID
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class UserFavoritePlaylistCreate(BaseModel):
    user_id: UUID
    playlist_id: UUID

    model_config = ConfigDict(from_attributes=True)
