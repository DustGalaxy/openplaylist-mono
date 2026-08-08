from uuid import UUID

from sqlalchemy import ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base, TimestampMixin, UUIDMixin


class UserFavoritePlaylist(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "user_favorite_playlists"

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    playlist_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("playlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "playlist_id", name="uq_user_favorite_playlist"),
        Index("ix_user_favorite_playlists_user_created", "user_id", "created_at"),
    )
