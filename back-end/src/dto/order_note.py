from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OrderNoteUpsert(BaseModel):
    note: str = Field(..., min_length=1, max_length=500, description="Note text up to 500 characters")
    is_public: bool = Field(default=True, description="Whether the note is visible to all playlist viewers")


class OrderNoteResponse(BaseModel):
    order_id: UUID
    playlist_id: UUID
    note: str | None = None
    is_public: bool = True

    model_config = ConfigDict(from_attributes=True)
