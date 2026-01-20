from datetime import datetime

from pydantic import BaseModel

from _types import Source


class PlayNow(BaseModel):
    track_id: str | None
    playlist_id: str

    class Config:
        from_attributes = True


class Added(BaseModel):
    id: str
    playlist_id: str
    yt_video_id: str
    priority: str
    title: str
    duration: int
    requester_nickname: str
    created_at: datetime
    source: Source


class Deleted(BaseModel):
    track_id: str
    playlist_id: str


class Moved(BaseModel):
    track_id: str

    playlist_id: str


class Private(BaseModel):
    owner_id: str
    playlist_id: str


class Public(BaseModel):
    owner_id: str
    playlist_id: str
