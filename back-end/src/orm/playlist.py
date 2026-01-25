from uuid import UUID
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB, ARRAY, UUID as PGUUID

from database import Base, UUIDMixin, TimestampMixin


class Playlist(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "playlists"

    owner_id: Mapped[UUID] = mapped_column(PGUUID, nullable=False)
    owner_nickname: Mapped[str]
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    
    track_data: Mapped[list[dict]] = mapped_column(ARRAY(JSONB), nullable=True, default=list)
    now_playing: Mapped[str] = mapped_column(String, nullable=True)

    settings: Mapped["PlaylistSettings"] = relationship(  # noqa: F821 # type: ignore
        "PlaylistSettings",
        uselist=False,
        lazy="joined",
        cascade="all, delete-orphan",
        single_parent=True,
    )

    def __repr__(self):
        return f"<Playlist(id={self.id}, name='{self.name}', owner_id={self.owner_id} settings={self.settings}, )>"
